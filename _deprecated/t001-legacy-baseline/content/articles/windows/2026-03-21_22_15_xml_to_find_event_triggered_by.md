---
Title: "xml to find event triggered by windows hello"
Date: "2026-03-21_22_15"
Tags:
  - Windows
Category: "Windows"
Source_Products:
  - AI_Mode
  - Search
---
Finding Events Triggered by Windows Hello
=====================================

To find events triggered by Windows Hello (facial recognition or fingerprint), you can use a custom XML filter in the Event Viewer or PowerShell. Windows Hello events are typically logged in the Security log under Event ID 4624 (Successful Logon). Specifically, Windows Hello uses Logon Type 11 (CachedInteractive) or Logon Type 2 (Interactive), but the key differentiator is the "Key Credential Manager" or "Microsoft-Windows-Hello-For-Business" provider.

### XML Query for Task Scheduler or Event Viewer

You can copy the following XML into the XML tab of a "Filter Current Log" dialog or a "Custom Event Trigger" in Task Scheduler.

```xml
<QueryList>
  <Query Id="0" Path="Security">
    <Select Path="Security">
      *[System[(EventID=4624)]] and 
      *[EventData[Data[@Name="LogonProcessName"] and (Data="KeyCredMgr")]]
    </Select>
  </Query>
</QueryList>
```

### Key Event IDs to Watch

The following event IDs are relevant when monitoring Windows Hello activity:

* **Event ID 4624**: Successful logon. Look for "LogonProcessName" as "KeyCredMgr" to identify a Windows Hello login.
* **Event ID 4625**: Failed logon attempt.
* **Event ID 7203**: Specific to Windows Hello availability and biometric state.

### How to Apply This Filter

To apply the filter in Event Viewer:

1. Open Event Viewer.
2. Navigate to Windows Logs > Security.
3. Click Filter Current Log... in the right-hand panel.
4. Go to the XML tab and check Edit query manually.
5. Paste the provided XML code and click OK.

### PowerShell Method

You can also use PowerShell to see the last 10 Windows Hello logins:

```powershell
$xmlQuery = @"
<QueryList>
  <Query Id="0" Path="Security">
    <Select Path="Security">
      *[System[(EventID=4624)]] and *[EventData[Data[@Name="LogonProcessName"] and (Data="KeyCredMgr")]]
    </Select>
  </Query>
</QueryList>
"@
Get-WinEvent -FilterXml $xmlQuery -MaxEvents 10 | Select-Object TimeCreated, Message
```

### Including Additional Event Codes

To include Event ID 1001, which is often found in the Application log (related to Windows Error Reporting or Microsoft 365 sign-in issues), you need to query multiple log paths.

### XML Filter for Multiple Logs

The following query checks the Security log for Hello-specific logins (4624/4625), the Biometrics log for device status (7203), and the Application log for the error (1001).

```xml
<QueryList>
  <!-- Query for Windows Hello Logins & Failures -->
  <Query Id="0" Path="Security">
    <Select Path="Security">
      *[System[(EventID=4624 or EventID=4625)]] and 
      *[EventData[Data[@Name="LogonProcessName"] and (Data="KeyCredMgr")]]
    </Select>
  </Query>
  <!-- Query for Windows Hello Device Status -->
  <Query Id="1" Path="Microsoft-Windows-Biometrics/Operational">
    <Select Path="Microsoft-Windows-Biometrics/Operational">
      *[System[(EventID=7203)]]
    </Select>
  </Query>
  <!-- Query for Login/Application Errors -->
  <Query Id="2" Path="Application">
    <Select Path="Application">
      *[System[(EventID=1001)]]
    </Select>
  </Query>
</QueryList>
```

### PowerShell Command

The following script pulls the most recent events for all these IDs across the different logs.

```powershell
$Events = Get-WinEvent -FilterXml @"
<QueryList>
  <Query Id="0" Path="Security">
    <Select Path="Security">*[System[(EventID=4624 or EventID=4625)]] and *[EventData[Data[@Name="LogonProcessName"] and (Data="KeyCredMgr")]]</Select>
  </Query>
  <Query Id="1" Path="Microsoft-Windows-Biometrics/Operational">
    <Select Path="Microsoft-Windows-Biometrics/Operational">*[System[(EventID=7203)]]</Select>
  </Query>
  <Query Id="2" Path="Application">
    <Select Path="Application">*[System[(EventID=1001)]]</Select>
  </Query>
</QueryList>
"@
$Events | Select-Object TimeCreated, Id, LogName, Message | Out-GridView
```

### Summary of Events Captured

The following events are captured by these queries:

* **4624 (Security)**: Successful Hello logon (Fingerprint/Face).
* **4625 (Security)**: Failed logon attempt via Hello.
* **7203 (Biometrics)**: Windows Hello engine/sensor availability status.
* **1001 (Application)**: Windows Error Reporting or Microsoft 365 "Something went wrong" sign-in errors.

You can further analyze these events by exporting them to a CSV file.
