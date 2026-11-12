# Security notes

Pin2Pin is designed for a single user on a trusted local computer. The server binds to
`127.0.0.1`; there is no login system or protection for a remotely exposed instance.
Do not expose it to a LAN, public internet, reverse proxy, or shared host without first
adding authentication, authorization, CSRF protections, and an appropriate deployment
security review.

Provider and resource credentials are stored in the local `backend/.env` file. Runtime
databases, OAuth material, generated files, conversations, and agent memory are ignored
by Git. Never commit those files, paste secrets into issues, or use `git add -f` on local
state. If a credential is accidentally published, revoke it with its provider.

External actions must be explicitly approved in the dashboard. Verify the destination
and content before approving any email or post.

To report a security issue, do not open a public issue containing exploit details or
credentials. Contact the repository maintainer privately.
