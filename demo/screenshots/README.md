# Demo

Video (about 4.5 minutes): YOUR_VIDEO_LINK

What the video shows:

1. Google login and the dashboard
2. Composing a campaign: sender choice, list upload with the email count, rich text body, delay and hourly limit
3. Restart test: API, worker, and Redis stopped and started, the waiting emails still go out once each
4. Hourly limit: extra emails pushed to the next hour, and a real Slack alert
5. Load test: 1000 emails at once
6. Search and the Bull Board queue dashboard

Screenshots are in `screenshots/`.