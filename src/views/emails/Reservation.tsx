
// /apps/api/src/views/emails/Reservation.tsx
/** @jsx jsx */
/** @jsxImportSource hono/jsx */

import { View } from './ViewLayout'
import { ReservationRecord } from '../../services/reservation'
import { style } from "./style"
import { toDate } from '@/types'

export interface ReservationEmailProps {
  reservation: ReservationRecord,
  appUrl: string
}

export const ReservationEmail = ({ reservation, appUrl }: ReservationEmailProps) => {
  const statusColors = {
    oncoming: "#4caf50",
    done: "#3f51b5",
    late: "#ff9800",
    rescheduled: "#9c27b0",
    canceled: "#f44336"
  };
  
  const statusColor = statusColors[reservation.reservation.status] || "#757575";
  const checkStatusUrl = `${appUrl}/check_reservation?number=${reservation.reservation.reservationNumber}`;
  const formattedDate = toDate(reservation.reservation.date).toLocaleDateString();

  return (
    <View>
      <div class={style.container}>
        <h1 style="color: #333; text-align: left;">Reservation Confirmation</h1>
        
        <div style="background-color: #f5f5f5; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="margin-top: 0; color: #333;">Reservation #{reservation.reservation.reservationNumber}</h2>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-weight: bold;">Status:</span>
            <span style={`color: ${statusColor}; font-weight: bold;`}>{reservation.reservation.status.toUpperCase()}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-weight: bold;">Date:</span>
            <span>{formattedDate}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-weight: bold;">Time:</span>
            <span>{reservation.reservation.time.from} - {reservation.reservation.time.to}</span>
          </div>
        </div>
        
        <div style="background-color: #f5f5f5; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #333;">Pet Details</h3>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-weight: bold;">Name:</span>
            <span>{reservation.pet.name}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-weight: bold;">Species:</span>
            <span>{reservation.pet.specie}</span>
          </div>
        </div>
        
        <div style="background-color: #f5f5f5; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #333;">Client Information</h3>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-weight: bold;">Name:</span>
            <span>{reservation.user.name} {reservation.user.surname}</span>
          </div>
          {reservation.user.email && (
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="font-weight: bold;">Email:</span>
              <span>{reservation.user.email}</span>
            </div>
          )}
          {reservation.user.phoneNumber && (
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="font-weight: bold;">Phone:</span>
              <span>{reservation.user.phoneNumber}</span>
            </div>
          )}
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href={checkStatusUrl} class={style.button}>
            Check Reservation Status
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          If you need to reschedule or cancel your appointment, please contact us at least 24 hours in advance.
        </p>
      </div>
    </View>
  );
}
