import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
const SEND_TO = process.env.SEND_TO_EMAIL;

// In-memory rate limiter: max 5 requests per IP per minute
const rateLimitMap = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 5;
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > windowMs) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return false;
  }
  if (entry.count >= maxRequests) return true;
  entry.count++;
  rateLimitMap.set(ip, entry);
  return false;
}

// Strip HTML tags from user input to prevent injection in email body
function sanitize(str) {
  if (!str) return "";
  return String(str).replace(/[<>&"']/g, function (c) {
    return {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      '"': "&quot;",
      "'": "&#39;",
    }[c];
  });
}

const ALLOWED_ORIGINS = [
  "https://phdsecurity.com.au",
  "https://www.phdsecurity.com.au",
];

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Rate limiting
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  if (isRateLimited(ip)) {
    return res
      .status(429)
      .json({ error: "Too many requests. Please try again later." });
  }

  const {
    name,
    email,
    contact_number,
    subject,
    message,
    recaptchaToken,
    hp_website,
  } = req.body;

  // Server-side honeypot check
  if (hp_website) {
    return res.status(200).json({ success: true }); // Silently succeed to not tip off bots
  }

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
      subject: sanitize(subject) || "New Contact Form Submission",
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${sanitize(name)}</p>
        <p><strong>Email:</strong> ${sanitize(email)}</p>
        <p><strong>Contact Number:</strong> ${sanitize(contact_number) || "Not provided"}</p>
        <p><strong>Subject:</strong> ${sanitize(subject) || "Not provided"}</p>
        <p><strong>Message:</strong><br/>${sanitize(message)}</p>
      `,
    });
    res.status(200).json({ success: true, data: emailData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
