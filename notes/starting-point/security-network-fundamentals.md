# CompTIA Security+ - Network Security
category: Security
tags: security, networking, comptia, vpn, firewalls

## VPNs (Virtual Private Networks)

### IPSec - Network layer encryption, tunnel/transport modes
- ESP (Encapsulating Security Payload) - provides confidentiality
- AH (Authentication Header) - provides integrity
- Tunnel mode - entire IP packet encrypted
- Transport mode - only payload encrypted

### SSL/TLS VPN - Application layer, easier client setup
- No client software required (browser-based)
- Works through NAT/firewalls easily
- More granular access control

### Split tunneling - Route some traffic through VPN, some direct
- Reduces bandwidth usage
- Can create security risks
- Policy-based routing

## Firewalls

- **Packet filtering** - Layer 3/4, examines headers only
- **Stateful inspection** - Tracks connection state, more secure
- **Application layer** - Deep packet inspection, content filtering
- **Next-gen firewalls (NGFW)** - Include IPS, application awareness, user identification

## Network Segmentation

- **VLANs** - Layer 2 segmentation
- **Subnetting** - Layer 3 segmentation
- **DMZ** - Demilitarized zone for public services
- **Air gapping** - Physical network separation

## Network Access Control (NAC)

- 802.1X authentication
- Device compliance checking
- Quarantine networks for non-compliant devices
- Certificate-based authentication