# Refresh token

A refresh token is used to generate an access token.  An access token is required with every call to Sharepoint endpoints within the 365 REST API. This is required in order for the various JavaScript applications that store data in Azure (e.g. [ACCMobile](https://accmobile.azurewebsites.us/), [PGH Supply](https://pghsupply.azurewebsites.us/), and [Maintenance Requests](https://maintenancerequest.azurewebsites.us/login)) to function properly. The full list of those sites can be found [here](https://portal.azure.us/#@pittazuregov.onmicrosoft.com/resource/subscriptions/07fefdba-84eb-4d6b-b398-ab8737a57f95/resourceGroups/client-applications/overview). 

**A new refresh token must be generated every six months.**

Last refresh: 6/26/2020  
**Next refresh needed by 12/16/2020 (ten-day buffer to be safe)**

To complete this process, you must be set up as a Sharepoint administrator in 365, and must have admin access over each inidvidual SharePoint site as well (you can configure that from [this page](https://cityofpittsburgh-admin.sharepoint.com/_layouts/15/online/SiteCollections.aspx)). Consult Paul Scherrer or the service desk if you need to become a Sharepoint admin.

Before beginning the process, **read through all the steps below**. We recommend using the [Postman](https://www.postman.com/) desktop application for constructing the required API calls. You'll be most efficient if, prior to starting, you open up three tabs in Postman and construct the API calls required in steps 2, 3, and 4. To start, leave blank the param values you'll generate over the course of the process, then fill them in once you've got them and you're ready to fire off a request. It's also wise to open up a Word document to store the client ID, client secret, and Bearer token values as you generate them for use later in the process.

## Step 1: Register the app
Navigate [here](https://cityofpittsburgh.sharepoint.com/_layouts/15/appregnew.aspx ), and register a new third party application in the Sharepoint tenant.

| Field      | Value |
| ----------- | ----------- |
| Client Id      | { Click "Generate" } |
| Client Secret   | { Click "Generate" } |
| Title   | 365 Proxy { add short UUID here } |
| App Domain   | www.azurewebsites.us |
| Redirect URI   | https://localhost/ |

Click "Create," and save this information for further steps.

## Step 2: Get the tenant realm
Fire up an API client, and make a GET call to retrieve the realm ID of the 365 Sharepoint tenant. This can be accomplished via `curl` as follows:

`
curl -H "Authorization: Bearer" https://cityofpittsburgh.sharepoint.com/_vti_bin/client.svc -i 
`
We recommend using [Postman](getpostman.com) throughout this process, however.

In the response object, inspect the headers for the "WWW-
Authenticate" attribute.  Here you will find the realm:

`
WWW-Authenticate  -> Bearer realm="xxxxxx-xxxxx-xxxxx-xxxx", ...
`

Save this UUID for further steps.

## Step 3: Get the auth code from Azure ACS.
Construct the following url with the client ID generated in step 1, encoded properly.  Here, line breaks and indents have been added for readability.  But this is just one long string with query parameters:

https://cityofpittsburgh.sharepoint.com/_layouts/oauthauthorize.aspx?  
>client_id={ Encoded client Id from step 1 }  
>&scope=AllSites.Manage   
>&response_type=code  
>&redirect_uri=https%3A%2F%2Flocalhost%2F 

Navigate to this URL from a browser.  You will be prompted to approve the permissions granted to the application created in step 1 ("Do you trust  365 Proxy...").  Click "Trust It."

After granting trust, you will be redirected to the redirect URI defined in step 1, appended with a temporary authorization code included as a query string:

`
https://localhost/?code={ auth code }
`

This authorization code expires in 5 minutes.  So, save it for further steps, and start moving faster...

## Step 4: Generate the refresh token
To generate the refresh token, construct the following POST call, with all supplied values properly encoded and passed as **body parameters**:

POST https://accounts.accesscontrol.windows.net/{ Tenant realm from step 2 }/tokens/OAuth/2

>grant_type=authorization_code   
>&client_id={ client Id from step 1 }@{ tenant realm from step 2 }  
>&client_secret={ client secret from step 1 }  
>&code={ Authorization code from step 3 }  
>&redirect_uri=https://localhost/
>&resource=00000003-0000-0ff1-ce00-000000000000/cityofpittsburgh.sharepoint.com@{ Tenant realm from step 2 }

Fire off the POST request, and inspect the response body for the refresh token:

```
{
    "token_type": "Bearer",
    ...
    "refresh_token": { BINGO }
    ...
}
```

This token is good for 6 months.

## Step 5: Update environment variables on server, and in dev

Navigate to [AZ Monitor](https://azmonitor.azurewebsites.us/) (our interface for managing configuration of the Azure applications) and click "Configure" from the dropdown menu. From there, click the "Application" dropdown. 

For both the production service (365proxy) and the staging service (365proxy-staging), update all application settings with the new values for the following environment variables:

```
SP_ID={ Encoded client Id from step 1 }%40{ Encoded tenant realm from step 2 } 
SP_SECRET={ Encoded client secret from step 1 }
SP_TOKEN={ New refresh token from step 4 }
```
**Be sure to encode the SP_ID and SP_SECRET values correctly or the apps will not work.** To do so, pass them into [this tool](https://www.urlencoder.org/), click "ENCODE", and use the string that appears in the box below. 

Update the values in your local version of the 365proxy repo well. Lastly, update this README with the new refresh dates, and make sure that the Outlook calendar invite is set to recur in six months for ip.analytics@pittsburghpa.gov and IP-Applications@pittsburghpa.gov.

Consult the service desk if you don't have a login for the cop.city.pittsburgh.pa.us Azure account, where the configurations for these applications are stored; such a login is not necessary for the process described here, but it's nice to have for reference.
