# Runbook: Node.js blocked from the network on a managed dev workstation

## Symptom
`npm install` hangs or fails with `EACCES`; any `node` outbound connection fails:

```
http fetch GET https://registry.npmjs.org/... failed with EACCES
# and a bare test:
node -e 'require("net").connect({host:"1.1.1.1",port:443}).on("error",e=>console.log(e.code))'
# -> EACCES
```

…while `curl`, `git`, and PowerShell reach the same hosts fine.

## Root cause
A **Microsoft Intune-pushed Windows Firewall rule** blocks `node.exe` outbound
(an anti-"living off the land" hardening control). It is a WFP filter owned by
`FWPM_PROVIDER_MPSSVC_WF` and does **not** appear in the local firewall rule
store, so `Get-NetFirewallRule` (default store) shows nothing.

## Diagnosis
```powershell
# 1) Confirm it's node-specific (copy works, original doesn't):
Copy-Item "C:\Program Files\nodejs\node.exe" "$env:TEMP\nodecopy.exe"
& "$env:TEMP\nodecopy.exe" -e 'require("net").connect({host:"1.1.1.1",port:443},()=>console.log("OK")).on("error",e=>console.log(e.code))'

# 2) Find the managed rules + their source:
Get-NetFirewallRule -PolicyStore ActiveStore |
  Where-Object DisplayName -like 'block nodejs*' |
  Select-Object DisplayName, Direction, Action, Enabled, PolicyStoreSourceType
# Expect: Outbound / Block / Enabled / MDM

# 3) Identify the MDM authority:
dsregcmd /status   # WorkplaceMdmUrl -> *.manage.microsoft.com == Intune
```

## Resolution (at the Intune source — do NOT delete locally; MDM re-applies it)
1. Intune admin center → **Endpoint security → Firewall** (the *Firewall Rules*
   policy type), or **Devices → Configuration profiles** (Settings Catalog /
   Custom OMA-URI `./Vendor/MSFT/Firewall/MdmStore/FirewallRules/...`). Find the
   `block nodejs *` rules via the MDM diagnostics report:
   `mdmdiagnosticstool.exe -out C:\MDMDiag; start C:\MDMDiag\MDMDiagReport.html`.
2. Either **remove** the two `block nodejs *` rules, or add a **device exclusion
   group** (containing the dev workstation) to the policy's
   **Assignments → Excluded groups**.
   - Note: a firewall **allow** rule does **not** override a **block** — the block
     must be removed or unassigned.
3. Sync the device: Settings → Accounts → Access work or school → Info → **Sync**
   (or `Start-ScheduledTask -TaskPath '\Microsoft\Windows\EnterpriseMgmt\*' -TaskName PushLaunch`).
   Group-membership propagation can take 15–30+ min.
4. Verify cleared:
   ```powershell
   Get-NetFirewallRule -PolicyStore ActiveStore | Where-Object DisplayName -like 'block nodejs*'
   ```
   Empty result = unblocked.

## Notes
- This affects **local dev only**. Production (Azure App Service) is unaffected.
- Keep the control fleet-wide; scope the exception to dev machines.
