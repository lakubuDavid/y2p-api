// /apps/api/src/services/notification.ts
import { Resend } from "resend";
import { SelectUser } from "../db/schemas/user";
import { SelectMagicLink } from "../db/schemas/magicLink";
import { MagicLinkEmail } from "../views/emails/MagicLink";
import { ReservationRecord } from "./reservation";
import { ReservationEmail } from "../views/emails/Reservation";
import { ErrorCodes, Fail, Ok, Result } from "../../lib/error";

export class NotificationService {
  private resend: Resend;
  private appUrl: string;
  private senderEmail: string;

  constructor(resendApiKey: string, appUrl: string, senderEmail: string) {
    this.resend = new Resend(resendApiKey);
    this.appUrl = appUrl;
    this.senderEmail = senderEmail;
  }

  /**
   * Send a magic link email
   */
  public async sendMagicLinkEmail(
    magicLink: SelectMagicLink,
    user: Pick<SelectUser, "email" | "name">,
  ): Promise<Result<boolean>> {
    try {
      const magicLinkUrl = `${this.appUrl}/auth/verify?token=${magicLink.token}`;

      await this.resend.emails.send({
        from: this.senderEmail,
        to: user.email,
        subject: "Your Login Link",
        html: await MagicLinkEmail({
          magicLink,
          appUrl: this.appUrl,
          userName: user.name,
        }).toString(),
      });

      return Ok(true);
    } catch (error) {
      return Fail(
        `Failed to send email: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        ErrorCodes.EMAIL_SENDING_FAILED,
      );
    }
  }

  /**
   * Send a reservation confirmation email
   */
  public async sendReservationEmail(
    reservation: ReservationRecord,
  ): Promise<Result<boolean>> {
    try {
      // Skip if no email available
      if (!reservation.user.email) {
        console.warn("No email to send to");
        return Ok(false);
      }

      const content: string = await ReservationEmail({
        reservation,
        appUrl: this.appUrl,
      }).toString();
      console.log("content",content);
      

      const response = await this.resend.emails.send({
        from: this.senderEmail,
        to: reservation.user.email,
        subject: `Reservation Confirmation #${reservation.reservation.reservationNumber}`,
        html: content,
      });
      if (response.error) {
        return Fail(`Failed to send the email : ${response.error.message}`);
      }
      return Ok(true);
    } catch (error) {
      return Fail(
        `Failed to send reservation email: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        ErrorCodes.EMAIL_SENDING_FAILED,
      );
    }
  }
}
