/** @jsx jsx */
/** @jsxImportSource hono/jsx */

import { Fragment, PropsWithChildren } from 'hono/jsx'
import { Style } from "hono/css"
export const View = ({ children }: PropsWithChildren) => {
  return (
    <html>
      <head>
        <Style />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
