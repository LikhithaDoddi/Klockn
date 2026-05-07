# Klockn — cPanel Upload Instructions

## Files to upload (all of these go into public_html/)

```
index.html          ← Landing page
login.html          ← Organizer login
submit.php          ← Waitlist form handler
admin.php           ← Your leads dashboard
thankyou.html       ← Post-signup page
privacy.html        ← Privacy policy
terms.html          ← Terms of service
404.html            ← Custom not found page
.htaccess           ← Apache config (HTTPS, clean URLs, security)
sitemap.xml         ← For Google
robots.txt          ← For search crawlers
favicon.svg         ← Browser tab icon
og-image.svg        ← Social share preview image
```

## Step-by-step upload

1. Log into GoDaddy → My Products → Web Hosting → Manage
2. Open cPanel → File Manager
3. Navigate to `public_html/`
4. Upload ALL files above (including .htaccess — make sure hidden files are shown)
5. Done. Visit klockn.com

## ⚠️ Important: Set up your email first

Before the waitlist form will send you emails:
1. In cPanel → Email Accounts → Create `hello@klockn.com`
2. That's it — submit.php uses GoDaddy's mail server automatically

## Admin panel

Visit: `klockn.com/admin`
Default password: `klockn2026`

**Change this password immediately after uploading:**
Open `admin.php`, find line:
```php
define('ADMIN_PASSWORD', 'klockn2026');
```
Replace `klockn2026` with your own password.

## Clean URLs

After uploading .htaccess, these all work:
- klockn.com/login (not /login.html)
- klockn.com/privacy
- klockn.com/terms
- klockn.com/admin → admin.php

## Verify everything works

- [ ] klockn.com loads the landing page
- [ ] klockn.com/login shows the login page
- [ ] klockn.com/privacy shows the privacy policy
- [ ] klockn.com/terms shows terms of service
- [ ] Waitlist form submits → you get email at likithawa2020@gmail.com
- [ ] Waitlist form redirects to /thankyou
- [ ] klockn.com/admin shows the admin login
- [ ] klockn.com/broken-url shows the custom 404 page
- [ ] http://klockn.com redirects to https://klockn.com (may take a few minutes)
