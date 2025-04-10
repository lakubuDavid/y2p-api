/** @jsx jsx */
/** @jsxImportSource hono/jsx */

import { View } from './ViewLayout'
import { MagicLinkData } from '@/types';
import { style } from "./style"

export interface MagicLinkEmailProps {
  magicLink: MagicLinkData,
  appUrl: string,
  userName: string
}
export const MagicLinkEmail = ({ magicLink, appUrl, userName }: MagicLinkEmailProps) => {

  const magicLinkUrl = `${appUrl}/auth/verify?token=${magicLink.token}`;

  return (
    <View >
      <div class={style.container}>
        <h2>Welcome to our app</h2>
        <p>Hello {userName},</p>
        <p>Click the link below to sign in to your account:</p>
        <a
          href={magicLinkUrl}
          class={style.button}
        >Sign In</a>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't request this link, you can safely ignore this email.</p>
      </div>
    </View>
  )

}
