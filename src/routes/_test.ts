import { Hono } from "hono";
// import juice from "juice"
// import inlineCss from "inline-css"
import { MagicLinkEmail } from "../views/emails/MagicLink";
const views = new Hono();

views.get("/emails/magic", (c) => {
  let HTML = MagicLinkEmail({
    magicLink: { userId: 0, token: "", used: false },
    userName: "Math",
    appUrl: "#",
  }).toString();
  // console.log(inlineCss(HTML,{}))
  // console.log(juice(HTML))
  return c.html(HTML);
});

export default views;
