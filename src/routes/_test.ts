import { Hono } from "hono";
// import juice from "juice"
// import inlineCss from "inline-css"
import { MagicLinkEmail } from "../views/emails/MagicLink";
import { ReservationEmail } from "@/views/emails/Reservation";
const views = new Hono();

views.get("/emails/magic", (c) => {
  let HTML = MagicLinkEmail({
    magicLink: { userId: 0, token: "", used: false },
    userName: "Math",
    appUrl: process.env["CLIENT_URL"] ?? "#",
  }).toString();
  // console.log(inlineCss(HTML,{}))
  // console.log(juice(HTML))
  return c.html(HTML);
});

views.get("/emails/reservation", (c) => {
  let HTML = ReservationEmail({
    reservation: {
      pet: { id: 1, name: "Buddy", specie: "Dog", ownerId: 1, metadata: {} },
      user: {
        id: 1,
        name: "John",
        surname: "Doe",
        email: "",
        phoneNumber: "",
        verified: true,
        type: "client",
      },
      reservation: {
        id: 1,
        date: { year: 2025, month: 4, day: 17 },
        time: { from: "10:00", to: "11:00" },
        status: "oncoming",
        reservationNumber: "VET-20250417-TEST",
        createdAt: new Date(),
      },
    },
    appUrl: process.env["CLIENT_URL"] ?? "#",
  }).toString();
  // console.log(inlineCss(HTML,{}))
  // console.log(juice(HTML))
  return c.html(HTML);
});

export default views;
