import { SplashScreen } from "@capacitor/splash-screen";
import { Nfc, NfcTagTechType } from '@capawesome-team/capacitor-nfc';

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
      <p>
        This project is used to create a minimal, reproducible example. Just add
        the affected Capacitor platforms and plugins.
      </p>
      <button id="scan-card">Scan Card</button>
    </main>
    `;
    }

    async scanCard(nfcTag) {
      console.log("--------------- Output Card Info ---------------");
      console.log(nfcTag);
      console.log("ATQA:", nfcTag.atqa);
      console.log("Application Data:", nfcTag.applicationData);
      console.log("Barcode:", nfcTag.barcode);
      console.log("Can Make Read-Only:", nfcTag.canMakeReadOnly);
      console.log("DSF ID:", nfcTag.dsfId);
      console.log("Hi Layer Response:", nfcTag.hiLayerResponse);
      console.log("Historical Bytes:", nfcTag.historicalBytes);
      console.log("ID:", nfcTag.id);
      console.log("Is Writable:", nfcTag.isWritable);
      console.log("Manufacturer:", nfcTag.manufacturer);
      console.log("Max Size:", nfcTag.maxSize);
      console.log("Message:", nfcTag.message);
      console.log("Protocol Info:", nfcTag.protocolInfo);
      console.log("Response Flags:", nfcTag.responseFlags);
      console.log("SAK:", nfcTag.sak);
      console.log("System Code:", nfcTag.systemCode);
      console.log("Tech Types:", nfcTag.techTypes);
      console.log("Type:", nfcTag.type);
      console.log("--------------- Output Card Info END ---------------");

      if (nfcTag.id == undefined) {
        return;
      }
      console.log("--------------- Card Identifier ---------------");
      let id = this.getCardIdentifier(nfcTag.id);
      let hexId = this.hexEncodedString(nfcTag.id);
      console.log("ID:", id);
      console.log("Hex ID:", hexId);
      console.log("--------------- Card Identifier END ---------------");

      console.log("--------------- Send Command Select App --------------- ");
      // 1st command : select app
      let appId = 0x5F8415;
      // Create a byte array from the app ID
      let appIdByteArray = this.intToBytes(appId);
      console.log("App ID:", appIdByteArray);
      console.log("App ID Bytes:", appIdByteArray);
      // select app
      let selectAppCommand = this.compileNfcRequest(0x5a, appIdByteArray);
      console.log("Select App Command:", selectAppCommand);
      console.log("Select App Command Hex:", this.hexEncodedString(Array.from(selectAppCommand)));


      await this.sendNfcRequest(nfcTag, selectAppCommand, NfcTagTechType.Ndef).then(async (response) => {
        console.log("Response:", response);
        console.log("Response Hex:", this.hexEncodedString(Array.from(response)));
        console.log("Response Int:", this.bytesToInt(Array.from(response)));

        console.log("--------------- Send Command Read Value --------------- ");
        let readValueCommand = 0x6c;
        let readValueRequest = this.compileNfcRequest(readValueCommand, [0x01]);
        await this.sendNfcRequest(nfcTag, readValueRequest, NfcTagTechType.Ndef).then(async (response) => {
          console.log("Response:", response);
          console.log("Response Hex:", this.hexEncodedString(Array.from(response)));
          console.log("Response Int:", this.bytesToInt(Array.from(response)));

          console.log("--------------- Send Command Read Value END --------------- ");
        });
        console.log("--------------- Send Command Select App END --------------- ");
      });
    }

    // Send an NFC request to the tag
    async sendNfcRequest(tag, request, techType) {
      console.log("-------------------- Send NFC Request --------------------");
      console.log("Tag:", tag);
      console.log("techType:", techType);
      console.log("Request:", request);
      console.log("Request Hex:", this.hexEncodedString(Array.from(request)));
      console.log("Request Int:", this.bytesToInt(Array.from(request)));
      console.log("Request Bytes:", Array.from(request));
  
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
        console.log("-------------------- Send NFC Request END --------------------");
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
            await Nfc.stopScanSession();
            resolve(event.nfcTag);
          });
      
          Nfc.startScanSession();
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
