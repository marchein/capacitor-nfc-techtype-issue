import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { NfcUtils } from '@capawesome-team/capacitor-nfc';
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
      if (nfcTag.id !== undefined) {
        let id = this.getCardIdentifier(nfcTag.id);
        let hexId = this.hexEncodedString(nfcTag.id);
        console.log("ID:", id);
        console.log("Hex ID:", hexId);

        var readValueRequest = new Uint8Array();
        const techType = Capacitor.getPlatform() === 'ios' ? NfcTagTechType.Iso7816 : NfcTagTechType.IsoDep;

        if (Capacitor.getPlatform() === 'ios') {
          let appId = 0x5F8415;
          let appIdByteArray = this.intToBytes(appId);
          let selectAppCommand = this.compileNfcRequest(0x5a, appIdByteArray);
          await this.sendNfcRequest(nfcTag, selectAppCommand, techType);

          let readValueCommand = 0x6c;
          readValueRequest = this.compileNfcRequest(readValueCommand, [0x01]);
        } else {
          const nfcUtils = new NfcUtils();

          let selectAppCommand = nfcUtils.convertHexToBytes({
            hex: '0x905A0000035F841500'
          }).bytes;      
          await Nfc.connect({
            techType
          });
          await this.sendNfcRequest(nfcTag, selectAppCommand, techType);
          readValueRequest = nfcUtils.convertHexToBytes({
            hex: '0x906C0000010100'
          }).bytes;
        }
  
        const readValueResponse = await this.sendNfcRequest(nfcTag, readValueRequest, techType);
        if (Capacitor.getPlatform() === 'android') {
          Nfc.close();
        }
        Nfc.stopScanSession();

        let trimmedData = Array.from(readValueResponse);
        trimmedData.pop();
        trimmedData.pop();
        trimmedData.reverse();
        let currentBalanceRaw = this.bytesToInt(trimmedData);
        let currentBalanceValue = this.intToEuro(currentBalanceRaw);

        console.log("currentBalanceValue:", currentBalanceValue);
      }
    }    

    // Send an NFC request to the tag
    async sendNfcRequest(tag, request, techType) {
      console.log("Tag:", tag);
      console.log("Request:", request);
      console.log("techType:", techType);
  
      const dataAsNumberArray = Array.from(request);
      
      try {
        const transceiveResult = await Nfc.transceive({
          techType: techType,
          data: dataAsNumberArray
        });
      
        // Extract the 'response' property from TransceiveResult
        const response = transceiveResult.response || [];
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

    intToEuro(value) {
      return +(value / 1000).toFixed(2);
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

      self.shadowRoot.querySelector("#scan-card").addEventListener("click", async function () {
        const nfcTag = await read();
        await self.scanCard(nfcTag);
      });
    }
  },
);