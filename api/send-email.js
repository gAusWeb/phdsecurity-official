import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
const SEND_TO = process.env.SEND_TO_EMAIL;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://phdsecurity.com.au");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, email, contact_number, subject, message, recaptchaToken } =
    req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Verify reCAPTCHA token
  if (!recaptchaToken) {
    return res.status(400).json({ error: "Missing reCAPTCHA token" });
  }
  try {
    const verifyRes = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`,
      },
    );
    const verifyData = await verifyRes.json();
    if (!verifyData.success || verifyData.score < 0.5) {
      return res.status(400).json({ error: "Failed reCAPTCHA verification" });
    }
  } catch (err) {
    return res.status(500).json({ error: "reCAPTCHA verification failed" });
  }

  try {
    const emailData = await resend.emails.send({
      from: "Contact Form <onboarding@resend.dev>",
      to: [SEND_TO],
      subject: subject || "New Contact Form Submission",
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Contact Number:</strong> ${contact_number || "Not provided"}</p>
        <p><strong>Subject:</strong> ${subject || "Not provided"}</p>
        <p><strong>Message:</strong><br/>${message}</p>
      `,
    });
    res.status(200).json({ success: true, data: emailData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
