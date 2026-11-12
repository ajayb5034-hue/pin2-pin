# Security notes

Pin2Pin is designed for a single user on a trusted local computer. The server binds to
`127.0.0.1`; there is no login system or protection for a remotely exposed instance.
Do not expose it to a LAN, public internet, reverse proxy, or shared host without first
adding authentication, authorization, CSRF protections, and an appropriate deployment
security review.

The local server validates the `Host` header and checks browser `Origin` and
`Sec-Fetch-Site` headers on state-changing requests; WebSocket handshakes are checked
before acceptance. These checks reduce DNS-rebinding and cross-site request risks, but
do not replace real authentication. Pin2Pin remains single-user and local-only.

Provider and resource credentials are stored in the local `backend/.env` file. Runtime
databases, OAuth material, generated files, conversations, and agent memory are ignored
by Git. Never commit those files, paste secrets into issues, or use `git add -f` on local
state. If a credential is accidentally published, revoke it with its provider.

deAPI image and video generation can consume account credits. Connect only a key you
control, review the provider's model and pricing terms, and remember that task prompts
and generated assets are sent to the selected external provider. Engineering logs and
task conversations are stored in the local SQLite database; review them before sharing
diagnostic output publicly.

External actions must be explicitly approved in the dashboard. Verify the destination
and content before approving any email or post.

To report a vulnerability, use GitHub's private reporting: open the repository's
**Security** tab and choose **Report a vulnerability**. Please do not open a public
issue with exploit details or credentials.
