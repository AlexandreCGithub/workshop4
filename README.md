# Alexandre CORREIA Workshop 4
# Notes:

I succeded in implementing the onion router, since a manual test via postman (having launched npm run start) works
a POST request : http://localhost:3000/sendMessage with
 {
  "message": "coucou",
  "destinationUserId" : 1
}

then :
http://localhost:3001/getLastReceivedMessage

The logs proving the encrypting/decrypting of different layers will be displayed in the console. (should not be the case for real confidentiality, of course!)


However, the automatised testing will be stuck (will run for about 30 seconds before exiting and giving results)
at a RsaDecrypt function
it's really strange because it works perfectly when I test it with npm run strt as I said earlier.