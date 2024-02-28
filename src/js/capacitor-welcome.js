import { SplashScreen } from '@capacitor/splash-screen';
import { Nfc, NfcTagTechType, PollingOption } from '@capawesome-team/capacitor-nfc';

window.customElements.define(
  "capacitor-welcome",
  class extends HTMLElement {
    constructor() {
      super();

      SplashScreen.hide();

      const root = this.attachShadow({ mode: "open" });
      root.innerHTML = `
    <main>
      <h1 style="margin-top: 64px;">Capacitor NFC Issue</h1>
      <button id="scan-card">Scan Card</button>
    </main>
    `;
    }

    async scanCard(nfcTag) {
      console.log("--------------- Output Card Info ---------------");
      console.log(nfcTag);

      if (nfcTag.id !== undefined) {
        let id = this.getCardIdentifier(nfcTag.id);
        let hexId = this.hexEncodedString(nfcTag.id);
        console.log("ID:", id);
        console.log("Hex ID:", hexId);
    
        // 1st command : select app
        let appId = 0x5F8415;
        // Create a byte array from the app ID
        let appIdByteArray = this.intToBytes(appId);
        console.log("App ID:", appIdByteArray);
        console.log("App ID Bytes:", appIdByteArray);
        // select app
        let selectAppCommand = this.compileNfcRequest(0x5a, appIdByteArray);
    
        await this.sendNfcRequest(nfcTag, selectAppCommand, NfcTagTechType.Iso7816).then(async (response) => {
          let readValueCommand = 0x6c;
          let readValueRequest = this.compileNfcRequest(readValueCommand, [0x01]);
          console.log("Read Value Command:", readValueCommand);
          console.log("Read Value Request:", readValueRequest);

          await this.sendNfcRequest(nfcTag, readValueRequest, NfcTagTechType.Iso7816).then(async (response) => {
            Nfc.stopScanSession();
    
            let trimmedData = Array.from(response);
            trimmedData.pop();
            trimmedData.pop();
            trimmedData.reverse();
            let currentBalanceRaw = this.bytesToInt(trimmedData);
            let currentBalanceValue = this.intToEuro(currentBalanceRaw);
            this.lastCredit = currentBalanceValue;
            console.log("currentBalanceValue:", currentBalanceValue);
          });
        });
      }
    }    

    // Send an NFC request to the tag
    async sendNfcRequest(tag, request, techType) {
      console.log("-------------------- Send NFC Request --------------------");
      console.log("Tag:", tag);
      console.log("Request:", request);
      console.log("techType:", techType);
  
      const dataAsNumberArray = Array.from(request);
      
      try {
        const transceiveResult = await Nfc.transceive({
          techType: techType,
          data: dataAsNumberArray
        });
        console.log("Transceive Result:", transceiveResult);
      
        // Extract the 'response' property from TransceiveResult
        const response = transceiveResult.response || [];
        console.log("Request response:", response);
        return new Uint8Array(response);
  
      } catch (error) {
        console.log(error);
        return new Uint8Array();
      }
    }

    // Convert bytes to a hex-encoded string
    hexEncodedString(bytes) {
      return bytes.map(byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // Convert bytes to an integer
    bytesToInt(bytes) {
      return parseInt(this.hexEncodedString(bytes), 16);
    }

    // Convert an integer to bytes
    intToBytes(value) {
      return [(value >> 16) & 0xFF, (value >> 8) & 0xFF, value & 0xFF];
    }

    // Compile an NFC request command
    compileNfcRequest(command, parameter) {
      const buff = [0x90, command, 0x00, 0x00];

      if (parameter != null) {
        buff.push(parameter.length ?? 0);
        buff.push(...parameter);
      }

      buff.push(0x00);

      return new Uint8Array(buff);
    }

    // Get the card identifier from a byte array
    getCardIdentifier(byteArray) {
      let intValue = 0n;
      for (let i = byteArray.length - 1; i >= 0; i--) {
        intValue = (intValue << 8n) | BigInt(byteArray[i]);
      }

      return intValue.toString();
    }

    connectedCallback() {
      const self = this;

      const read = async () => {
        return new Promise((resolve) => {
          Nfc.addListener('nfcTagScanned', async (event) => {
            resolve(event.nfcTag);
          });
      
          Nfc.startScanSession({
            pollingOptions: [PollingOption.iso14443]
          });
        });
      };

      self.shadowRoot
        .querySelector("#scan-card")
        .addEventListener("click", async function (event) {
          read().then(async (nfcTag) => {
            await self.scanCard(nfcTag);
          });
        });
    }
  },
);
