import { prisma } from '../lib/prisma';
import { walletService } from '../services/wallet.service';
import { revenueService } from '../services/revenue.service';

/**
 * Synchronize wallet balances and revenue records with actual order data
 * This script recalculates everything from scratch to ensure accuracy
 */
async function syncWalletAndRevenue() {
  console.log('🔄 Starting wallet and revenue synchronization...\n');

  try {
    // Get all delivered orders
    const deliveredOrders = await prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        deliveredAt: { not: null },
      },
      select: {
        id: true,
        agentId: true,
        partnerId: true,
        payoutAmount: true,
        orderAmount: true,
        orderType: true,
        commissionRate: true,
        deliveredAt: true,
        createdAt: true,
      },
      orderBy: {
        deliveredAt: 'asc',
      },
    });

    console.log(`📦 Found ${deliveredOrders.length} delivered orders\n`);

    // Track statistics
    let agentWalletsUpdated = 0;
    let adminWalletsUpdated = 0;
    let revenueRecordsCreated = 0;
    let revenueRecordsUpdated = 0;
    let transactionsCreated = 0;
    let errors = 0;

    // Group orders by agent for wallet recalculation
    const agentOrders = new Map<string, typeof deliveredOrders>();
    const adminCommissions = new Map<string, number>(); // orderId -> commission

    for (const order of deliveredOrders) {
      if (order.agentId) {
        if (!agentOrders.has(order.agentId)) {
          agentOrders.set(order.agentId, []);
        }
        agentOrders.get(order.agentId)!.push(order);
      }

      // Calculate platform commission for admin wallet
      try {
        const revenue = await revenueService.calculateOrderRevenue(order.id);
        adminCommissions.set(order.id, revenue.platformFee);
      } catch (error: any) {
        console.warn(`⚠️  Could not calculate revenue for order ${order.id.substring(0, 8)}: ${error.message}`);
      }
    }

    // Recalculate agent wallets
    console.log('💰 Recalculating agent wallets...');
    for (const [agentId, orders] of Array.from(agentOrders.entries())) {
      try {
        // Calculate total earnings from orders
        const totalEarnings = orders.reduce((sum, order) => sum + (order.payoutAmount || 0), 0);

        // Get current wallet
        const wallet = await walletService.getAgentWallet(agentId);

        // Get all transactions for this agent
        let transactions: any[] = [];
        try {
          const result = await walletService.getWalletTransactions('AGENT_WALLET', wallet.id, 10000, 0);
          transactions = result.transactions || [];
        } catch (error: any) {
          console.warn(`  ⚠️  Could not fetch transactions for agent ${agentId.substring(0, 8)}: ${error.message}`);
        }
        
        // Calculate actual balance from transactions
        // Start from 0 and apply all transactions in order
        let actualBalance = 0;
        const sortedTransactions = [...transactions].sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        
        for (const txn of sortedTransactions) {
          if (txn.type === 'EARNING') {
            actualBalance += txn.amount;
          } else if (txn.type === 'PAYOUT') {
            actualBalance += txn.amount; // amount is already negative for payouts
          }
        }

        // Calculate total paid out from payout transactions
        const totalPaidOut = transactions
          .filter(txn => txn.type === 'PAYOUT')
          .reduce((sum, txn) => sum + Math.abs(txn.amount), 0);

        // Update wallet if values don't match
        if (Math.abs(wallet.balance - actualBalance) > 0.01 || 
            Math.abs(wallet.totalEarned - totalEarnings) > 0.01 ||
            Math.abs(wallet.totalPaidOut - totalPaidOut) > 0.01) {
          
          console.log(`  📊 Agent ${agentId.substring(0, 8)}: Updating wallet`);
          console.log(`     Balance: ${wallet.balance} → ${actualBalance}`);
          console.log(`     Total Earned: ${wallet.totalEarned} → ${totalEarnings}`);
          console.log(`     Total Paid Out: ${wallet.totalPaidOut} → ${totalPaidOut}`);

          await prisma.agentWallet.update({
            where: { agentId },
            data: {
              balance: actualBalance,
              totalEarned: totalEarnings,
              totalPaidOut: totalPaidOut,
            },
          });

          agentWalletsUpdated++;
        }

        // Ensure all orders have wallet transactions
        for (const order of orders) {
          const hasTransaction = transactions.some(txn => txn.orderId === order.id && txn.type === 'EARNING');
          
          if (!hasTransaction) {
            console.log(`  ➕ Creating missing transaction for order ${order.id.substring(0, 8)}`);
            
            // Calculate balance before this transaction
            const ordersBefore = orders.filter(o => 
              o.deliveredAt && order.deliveredAt && 
              new Date(o.deliveredAt) < new Date(order.deliveredAt)
            );
            const balanceBefore = ordersBefore.reduce((sum, o) => sum + (o.payoutAmount || 0), 0) - totalPaidOut;
            const balanceAfter = balanceBefore + (order.payoutAmount || 0);

            try {
              await prisma.walletTransaction.create({
                data: {
                  walletType: 'AGENT_WALLET',
                  agentWalletId: wallet.id,
                  orderId: order.id,
                  amount: order.payoutAmount || 0,
                  type: 'EARNING',
                  description: `Earning from order ${order.id.substring(0, 8).toUpperCase()}`,
                  balanceBefore,
                  balanceAfter,
                  status: 'COMPLETED',
                },
              });
              transactionsCreated++;
            } catch (error: any) {
              console.error(`  ❌ Failed to create transaction: ${error.message}`);
              errors++;
            }
          }
        }
      } catch (error: any) {
        console.error(`  ❌ Error processing agent ${agentId.substring(0, 8)}: ${error.message}`);
        errors++;
      }
    }

    // Recalculate admin wallet
    console.log('\n💰 Recalculating admin wallet...');
    try {
      const adminWallet = await walletService.getAdminWallet();
      const totalCommission = Array.from(adminCommissions.values()).reduce((sum, fee) => sum + fee, 0);

      // Get all admin transactions
      let adminTransactions: any[] = [];
      try {
        const result = await walletService.getWalletTransactions('ADMIN_WALLET', adminWallet.id, 10000, 0);
        adminTransactions = result.transactions || [];
      } catch (error: any) {
        console.warn(`  ⚠️  Could not fetch admin transactions: ${error.message}`);
      }

      // Calculate actual balance from transactions
      // Start from 0 and apply all transactions in order
      let actualAdminBalance = 0;
      const sortedAdminTransactions = [...adminTransactions].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      for (const txn of sortedAdminTransactions) {
        if (txn.type === 'COMMISSION') {
          actualAdminBalance += txn.amount;
        } else if (txn.type === 'PAYOUT') {
          actualAdminBalance += txn.amount; // amount is already negative for payouts
        }
      }

      // Calculate total deposited (commissions)
      const totalDeposited = adminTransactions
        .filter(txn => txn.type === 'COMMISSION')
        .reduce((sum, txn) => sum + txn.amount, 0);

      // Calculate total paid out
      const totalPaidOut = adminTransactions
        .filter(txn => txn.type === 'PAYOUT')
        .reduce((sum, txn) => sum + Math.abs(txn.amount), 0);

      if (Math.abs(adminWallet.balance - actualAdminBalance) > 0.01 ||
          Math.abs(adminWallet.totalDeposited - totalDeposited) > 0.01 ||
          Math.abs(adminWallet.totalPaidOut - totalPaidOut) > 0.01) {
        
        console.log(`  📊 Admin wallet: Updating`);
        console.log(`     Balance: ${adminWallet.balance} → ${actualAdminBalance}`);
        console.log(`     Total Deposited: ${adminWallet.totalDeposited} → ${totalDeposited}`);
        console.log(`     Total Paid Out: ${adminWallet.totalPaidOut} → ${totalPaidOut}`);

        await prisma.adminWallet.update({
          where: { id: adminWallet.id },
          data: {
            balance: actualAdminBalance,
            totalDeposited: totalDeposited,
            totalPaidOut: totalPaidOut,
          },
        });

        adminWalletsUpdated++;
      }

      // Ensure all orders have commission transactions
      for (const order of deliveredOrders) {
        const commission = adminCommissions.get(order.id);
        if (commission && commission > 0) {
          const hasTransaction = adminTransactions.some(txn => txn.orderId === order.id && txn.type === 'COMMISSION');
          
          if (!hasTransaction) {
            console.log(`  ➕ Creating missing commission transaction for order ${order.id.substring(0, 8)}`);
            
            // Calculate balance before this transaction
            const ordersBefore = deliveredOrders.filter(o => 
              o.deliveredAt && order.deliveredAt && 
              new Date(o.deliveredAt) < new Date(order.deliveredAt)
            );
            const balanceBefore = ordersBefore.reduce((sum, o) => {
              const fee = adminCommissions.get(o.id) || 0;
              return sum + fee;
            }, 0) - totalPaidOut;
            const balanceAfter = balanceBefore + commission;

            try {
              await prisma.walletTransaction.create({
                data: {
                  walletType: 'ADMIN_WALLET',
                  adminWalletId: adminWallet.id,
                  orderId: order.id,
                  amount: commission,
                  type: 'COMMISSION',
                  description: `Commission from order ${order.id.substring(0, 8).toUpperCase()}`,
                  balanceBefore,
                  balanceAfter,
                  status: 'COMPLETED',
                },
              });
              transactionsCreated++;
            } catch (error: any) {
              console.error(`  ❌ Failed to create commission transaction: ${error.message}`);
              errors++;
            }
          }
        }
      }
    } catch (error: any) {
      console.error(`  ❌ Error processing admin wallet: ${error.message}`);
      errors++;
    }

    // Synchronize revenue records
    console.log('\n📈 Synchronizing revenue records...');
    for (const order of deliveredOrders) {
      try {
        // Check if partner revenue exists
        let partnerRevenue = null;
        try {
          partnerRevenue = await prisma.partnerRevenue.findUnique({
            where: { orderId: order.id },
          });
        } catch (error: any) {
          // Table might not exist
          if (error?.code !== 'P2021' && error?.code !== '42P01') {
            throw error;
          }
        }

        // Check if platform revenue exists
        let platformRevenue = null;
        try {
          platformRevenue = await prisma.platformRevenue.findUnique({
            where: { orderId: order.id },
          });
        } catch (error: any) {
          // Table might not exist
          if (error?.code !== 'P2021' && error?.code !== '42P01') {
            throw error;
          }
        }

        // Calculate period dates (use order delivery date)
        const deliveredDate = order.deliveredAt || order.createdAt;
        const periodStart = new Date(deliveredDate);
        periodStart.setHours(0, 0, 0, 0);
        const periodEnd = new Date(periodStart);
        periodEnd.setHours(23, 59, 59, 999);

        // Create or update partner revenue
        if (order.partnerId) {
          try {
            const revenue = await revenueService.calculateOrderRevenue(order.id);
            
            if (!partnerRevenue) {
              await revenueService.createPartnerRevenue(
                order.partnerId,
                order.id,
                periodStart,
                periodEnd,
                'DAILY'
              );
              revenueRecordsCreated++;
              console.log(`  ➕ Created partner revenue for order ${order.id.substring(0, 8)}`);
            } else {
              // Update if values differ
              const needsUpdate = 
                Math.abs(partnerRevenue.orderAmount - revenue.orderAmount) > 0.01 ||
                Math.abs(partnerRevenue.platformFee - revenue.platformFee) > 0.01 ||
                Math.abs(partnerRevenue.netRevenue - revenue.netRevenue) > 0.01;

              if (needsUpdate) {
                await prisma.partnerRevenue.update({
                  where: { id: partnerRevenue.id },
                  data: {
                    orderAmount: revenue.orderAmount,
                    deliveryFee: revenue.deliveryFee,
                    platformFee: revenue.platformFee,
                    netRevenue: revenue.netRevenue,
                  },
                });
                revenueRecordsUpdated++;
                console.log(`  🔄 Updated partner revenue for order ${order.id.substring(0, 8)}`);
              }
            }
          } catch (error: any) {
            console.warn(`  ⚠️  Could not create/update partner revenue for order ${order.id.substring(0, 8)}: ${error.message}`);
            errors++;
          }
        }

        // Create or update platform revenue
        try {
          const revenue = await revenueService.calculateOrderRevenue(order.id);
          
          if (!platformRevenue) {
            await revenueService.createPlatformRevenue(
              order.id,
              order.partnerId,
              order.agentId,
              periodStart,
              periodEnd,
              'DAILY'
            );
            revenueRecordsCreated++;
            console.log(`  ➕ Created platform revenue for order ${order.id.substring(0, 8)}`);
          } else {
            // Update if values differ
            const needsUpdate = 
              Math.abs(platformRevenue.orderAmount - revenue.orderAmount) > 0.01 ||
              Math.abs(platformRevenue.platformFee - revenue.platformFee) > 0.01 ||
              Math.abs(platformRevenue.agentPayout - revenue.deliveryFee) > 0.01;

            if (needsUpdate) {
              await prisma.platformRevenue.update({
                where: { id: platformRevenue.id },
                data: {
                  orderAmount: revenue.orderAmount,
                  platformFee: revenue.platformFee,
                  agentPayout: revenue.deliveryFee,
                  netRevenue: revenue.platformFee,
                },
              });
              revenueRecordsUpdated++;
              console.log(`  🔄 Updated platform revenue for order ${order.id.substring(0, 8)}`);
            }
          }
        } catch (error: any) {
          console.warn(`  ⚠️  Could not create/update platform revenue for order ${order.id.substring(0, 8)}: ${error.message}`);
          errors++;
        }
      } catch (error: any) {
        console.error(`  ❌ Error processing revenue for order ${order.id.substring(0, 8)}: ${error.message}`);
        errors++;
      }
    }

    // Print summary
    console.log('\n✅ Synchronization complete!\n');
    console.log('📊 Summary:');
    console.log(`   Agent wallets updated: ${agentWalletsUpdated}`);
    console.log(`   Admin wallets updated: ${adminWalletsUpdated}`);
    console.log(`   Revenue records created: ${revenueRecordsCreated}`);
    console.log(`   Revenue records updated: ${revenueRecordsUpdated}`);
    console.log(`   Transactions created: ${transactionsCreated}`);
    console.log(`   Errors: ${errors}\n`);

  } catch (error: any) {
    console.error('❌ Synchronization failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  syncWalletAndRevenue()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { syncWalletAndRevenue };

