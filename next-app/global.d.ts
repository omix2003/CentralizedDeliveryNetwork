/// <reference types="next" />
/// <reference types="next/image-types/global" />

// Allow CSS imports (including side-effect imports)
declare module '*.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}
