# Garvit enquiry conversations

The public Contact page accepts enquiries. Enquiries and chat messages are stored in MongoDB. Candidates receive a private conversation link by email; administrators can review and reply from the Enquiries section of the admin dashboard. Email notifications are sent to the candidate for administrator replies and to the configured administrator for new candidate messages.

Configure these backend environment variables to enable email delivery:

| Variable | Description |
| --- | --- |
| `ENQUIRY_SMTP_HOST` | SMTP server hostname |
| `ENQUIRY_SMTP_PORT` | SMTP port, commonly `465` or `587` |
| `ENQUIRY_SMTP_SECURE` | Set to `true` for implicit TLS (commonly port `465`); otherwise use `false` |
| `ENQUIRY_SMTP_USER` | SMTP account username |
| `ENQUIRY_SMTP_PASSWORD` | SMTP account password or provider app password |
| `ENQUIRY_EMAIL_FROM` | Verified sender address |
| `ENQUIRY_ADMIN_EMAIL` | Address that receives new-enquiry and candidate-reply notifications |
| `FRONTEND_URL` | Public frontend origin, such as `https://garvit.example` |
| `JWT_SECRET` | Existing authentication secret; also used to encrypt private conversation tokens at rest |

Never commit SMTP credentials or production secrets. Keep `JWT_SECRET` stable while active enquiry links exist; changing it makes their encrypted access tokens unreadable. Each private link is a bearer credential: candidates should not share it. A private link can be resent from the admin inbox.

Enquiries are still saved if email delivery is unavailable. The admin inbox can then be used to retry sending the private conversation link after email settings are corrected.

## Student fee tracking

The admin dashboard lists student-role accounts from the registration collection. Fee totals and paid amounts are stored per student in the `studentfees` collection; the remaining balance is calculated from those values. New students appear with fees marked as not set until an administrator records their total fee and paid amount.

## Student tuition requests

During student registration, learners can optionally enter their class and select multiple courses from the course catalog as a tuition request. The request is saved on the student account for administrator review and is displayed in both the admin dashboard and that student's panel. Reviewing a request does not enroll the student or bypass course payment verification.

## UPI fee payments

Set these backend environment variables to show the student's UPI payment link and QR code:

| Variable | Description |
| --- | --- |
| `UPI_VPA` | The institute's UPI ID, for example `name@bank` |
| `UPI_MERCHANT_NAME` | Optional name shown in the UPI app; defaults to `Garvit Classes` |

Students can submit a transaction reference after paying. These payments are claims only: UPI settlement is not verified automatically, and a claim does not change the student's balance until an administrator checks the transaction in the UPI account and approves it from the admin panel. Reject references that cannot be matched. Never store UPI PINs, OTPs, or bank credentials in this application.

## Course and batch enrollment payments

Set a course or batch fee in its admin editor. A fee of `0` (or no fee on a legacy item) makes it free and students enroll immediately. A paid course or batch displays a UPI QR/link; submitting its UTR creates a pending payment and does not enroll the student. The administrator must verify the transfer and approve it in the admin payment section before enrollment is enabled.

## Course and batch video uploads

Uploaded video files are stored in a private Cloudflare R2 bucket. The backend issues short-lived upload URLs to administrators and short-lived playback URLs only to administrators, teachers, and students with approved enrollment. The database stores video metadata and object keys, not video bytes. Existing YouTube or other video links continue to work separately.

Set these backend environment variables:

| Variable | Description |
| --- | --- |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | Access key ID for an R2 API token |
| `R2_SECRET_ACCESS_KEY` | Secret access key for the R2 API token |
| `R2_BUCKET_NAME` | Name of the private R2 bucket |

Create an R2 API token with object read/write access to this bucket. Configure the bucket's CORS policy to allow your deployed frontend origin, `PUT`, `GET`, and `HEAD` methods, and the `Content-Type` and `Range` request headers. Expose `Accept-Ranges`, `Content-Range`, `Content-Length`, and `ETag` response headers so browser video playback and seeking work. Do not make the bucket public or put R2 credentials in frontend environment variables.

The admin forms accept MP4, WebM, OGG, MOV, and M4V uploads up to 1 GB per file. YouTube branding is part of YouTube's embedded player and cannot be removed; files uploaded to R2 play in the site's native video player without the YouTube logo.

## Study note attachments

Administrators can upload multiple attachments to each study note: PDF, DOC/DOCX, RTF, PPT/PPTX/ODP, XLS/XLSX/ODS, ODT, TXT, Markdown, CSV, JPEG, PNG, WebP, and GIF files up to 50 MB each. Attachments are stored privately in the same R2 bucket as course and batch videos. The database stores file metadata and object keys; authorized note readers receive short-lived download URLs. The R2 credentials and bucket CORS policy described above are also required for note uploads and downloads. Deleting a note or its course removes its stored attachments.

## Teacher salary payouts

Administrators can add each teacher's UPI ID in teacher management. These IDs and payout references are available only through the admin-only teacher endpoint. The salary panel creates a UPI link and QR code for the current monthly salary; it does not send money or verify settlement. After sending the payment, an administrator must confirm it in the UPI account and record the UTR. A payout can be recorded once per teacher per month, and the same UTR cannot be recorded twice.

Never record a payout before confirming the transfer, and never store UPI PINs, OTPs, or bank credentials in this application.
