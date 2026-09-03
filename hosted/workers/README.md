# Cloudflare Workers

API proxy Workers for the hosted version. Each Worker injects the real Nexus / TBA
API key (stored as a Worker Secret) so keys never reach browser-visible code.
