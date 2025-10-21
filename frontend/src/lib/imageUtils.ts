/**
 * Utility per gestire e correggere le immagini caricate, inclusa la rotazione EXIF
 */

import imageCompression from "browser-image-compression";

/**
 * Corregge la rotazione dell'immagine basandosi sui dati EXIF
 * Risolve il problema delle foto caricate dall'iPhone che appaiono ruotate
 * Usa browser-image-compression per una gestione robusta dell'orientamento
 */
export async function correctImageOrientation(file: File): Promise<File> {
  try {
    // browser-image-compression gestisce automaticamente l'orientamento EXIF
    const options = {
      maxSizeMB: 5,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      exifOrientation: 1, // Normalizza sempre a orientamento 1 (standard)
    };

    const compressedFile = await imageCompression(file, options);
    console.log(
      "✅ Image orientation corrected with browser-image-compression"
    );
    return compressedFile;
  } catch (error) {
    console.error("Error correcting image orientation:", error);
    return file;
  }
}

/**
 * Versione legacy - mantenuta per compatibilità ma non più usata
 */
export function correctImageOrientationLegacy(file: File): Promise<File> {
  return new Promise((resolve) => {
    // Se il file non è un'immagine, restituisci il file originale
    if (!file.type.startsWith("image/")) {
      resolve(file);
      return;
    }

    // Crea un FileReader per leggere i dati dell'immagine
    const reader = new FileReader();

    reader.onload = function (e) {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (!arrayBuffer) {
        resolve(file);
        return;
      }

      // Leggi l'orientamento EXIF dal file
      const orientation = getImageOrientation(arrayBuffer);

      console.log("📐 EXIF Orientation detected:", orientation);

      // Se non c'è orientamento EXIF o è già corretto (1), restituisci il file originale
      if (!orientation || orientation === 1) {
        console.log(
          "✓ No correction needed, orientation is",
          orientation || "not found"
        );
        resolve(file);
        return;
      }

      console.log("🔄 Applying correction for orientation:", orientation);

      // Crea un'immagine per processare il file
      const img = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve(file);
        return;
      }

      img.onload = function () {
        // Determina le dimensioni del canvas basandosi sulla rotazione
        let { width, height } = img;

        if (orientation >= 5 && orientation <= 8) {
          // Per rotazioni di 90° o 270°, scambia larghezza e altezza
          [width, height] = [height, width];
        }

        canvas.width = width;
        canvas.height = height;

        // Applica la trasformazione basandosi sull'orientamento EXIF
        switch (orientation) {
          case 2:
            // Flip orizzontale
            ctx.transform(-1, 0, 0, 1, width, 0);
            break;
          case 3:
            // Rotazione 180°
            ctx.transform(-1, 0, 0, -1, width, height);
            break;
          case 4:
            // Flip verticale
            ctx.transform(1, 0, 0, -1, 0, height);
            break;
          case 5:
            // Rotazione 90° CCW + flip orizzontale
            ctx.transform(0, 1, 1, 0, 0, 0);
            break;
          case 6:
            // Rotazione 90° CW
            ctx.transform(0, 1, -1, 0, height, 0);
            break;
          case 7:
            // Rotazione 90° CW + flip orizzontale
            ctx.transform(0, -1, -1, 0, height, width);
            break;
          case 8:
            // Rotazione 90° CCW
            ctx.transform(0, -1, 1, 0, 0, width);
            break;
          default:
            // Nessuna trasformazione
            break;
        }

        // Disegna l'immagine con la trasformazione applicata
        ctx.drawImage(img, 0, 0);

        // Converte il canvas in blob e poi in File
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const correctedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: file.lastModified,
              });
              resolve(correctedFile);
            } else {
              resolve(file);
            }
          },
          file.type,
          0.95
        ); // Usa qualità 95% per mantenere buona qualità
      };

      img.onerror = function () {
        resolve(file);
      };

      // Crea URL temporaneo per l'immagine
      const url = URL.createObjectURL(file);
      img.src = url;
    };

    reader.onerror = function () {
      resolve(file);
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Legge l'orientamento EXIF da un ArrayBuffer
 */
function getImageOrientation(arrayBuffer: ArrayBuffer): number | null {
  const dataView = new DataView(arrayBuffer);

  // Verifica se è un JPEG (inizia con 0xFFD8)
  if (dataView.getUint16(0) !== 0xffd8) {
    return null;
  }

  let offset = 2;
  let marker = dataView.getUint16(offset);

  // Cerca il marker EXIF (0xFFE1)
  while (offset < dataView.byteLength) {
    if (marker === 0xffe1) {
      // Verifica la signature EXIF
      const exifSignature = dataView.getUint32(offset + 4);
      if (exifSignature === 0x45786966) {
        // "Exif"
        return readOrientationFromExif(dataView, offset + 10);
      }
    }

    // Vai al prossimo marker
    const segmentLength = dataView.getUint16(offset + 2);
    offset += 2 + segmentLength;

    if (offset >= dataView.byteLength) break;
    marker = dataView.getUint16(offset);
  }

  return null;
}

/**
 * Legge l'orientamento dai dati EXIF
 */
function readOrientationFromExif(
  dataView: DataView,
  offset: number
): number | null {
  // Leggi il byte order (little-endian vs big-endian)
  const byteOrder = dataView.getUint16(offset);
  const littleEndian = byteOrder === 0x4949;

  // Verifica il magic number TIFF
  const tiffMagic = littleEndian
    ? dataView.getUint16(offset + 2, true)
    : dataView.getUint16(offset + 2, false);
  if (tiffMagic !== 0x002a) return null;

  // Offset alla prima directory IFD
  const firstIFDOffset = littleEndian
    ? dataView.getUint32(offset + 4, true)
    : dataView.getUint32(offset + 4, false);

  // Leggi il numero di entries nella directory
  const entriesCount = littleEndian
    ? dataView.getUint16(offset + firstIFDOffset, true)
    : dataView.getUint16(offset + firstIFDOffset, false);

  // Cerca il tag Orientation (0x0112)
  for (let i = 0; i < entriesCount; i++) {
    const entryOffset = offset + firstIFDOffset + 2 + i * 12;
    const tag = littleEndian
      ? dataView.getUint16(entryOffset, true)
      : dataView.getUint16(entryOffset, false);

    if (tag === 0x0112) {
      // Tag Orientation
      const orientation = littleEndian
        ? dataView.getUint16(entryOffset + 8, true)
        : dataView.getUint16(entryOffset + 8, false);
      return orientation;
    }
  }

  return null;
}

/**
 * Ridimensiona un'immagine mantenendo l'aspect ratio
 * Usa browser-image-compression per una gestione robusta
 */
export async function resizeImage(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.8
): Promise<File> {
  try {
    const options = {
      maxSizeMB: 5,
      maxWidthOrHeight: Math.max(maxWidth, maxHeight),
      useWebWorker: true,
      initialQuality: quality,
    };

    const resizedFile = await imageCompression(file, options);
    console.log("✅ Image resized with browser-image-compression");
    return resizedFile;
  } catch (error) {
    console.error("Error resizing image:", error);
    return file;
  }
}

/**
 * Versione legacy - mantenuta per compatibilità ma non più usata
 */
export function resizeImageLegacy(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(file);
      return;
    }

    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      resolve(file);
      return;
    }

    img.onload = function () {
      // Calcola le nuove dimensioni mantenendo l'aspect ratio
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      // Disegna l'immagine ridimensionata
      ctx.drawImage(img, 0, 0, width, height);

      // Converte in blob e poi in File
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: file.lastModified,
            });
            resolve(resizedFile);
          } else {
            resolve(file);
          }
        },
        file.type,
        quality
      );
    };

    img.onerror = function () {
      resolve(file);
    };

    const url = URL.createObjectURL(file);
    img.src = url;
  });
}

/**
 * Processa un'immagine: corregge l'orientamento EXIF e ridimensiona
 * Usa browser-image-compression per una gestione completa e robusta
 */
export async function processImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    correctOrientation?: boolean;
    resize?: boolean;
  } = {}
): Promise<File> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.85,
    correctOrientation = true,
  } = options;

  try {
    console.log("🔄 Processing image:", file.name, file.type, file.size);

    // Usa browser-image-compression che gestisce tutto automaticamente
    const compressionOptions = {
      maxSizeMB: 5,
      maxWidthOrHeight: Math.max(maxWidth, maxHeight),
      useWebWorker: true,
      initialQuality: quality,
      // Questa opzione forza la correzione dell'orientamento EXIF
      exifOrientation: correctOrientation ? undefined : 1,
    };

    const processedFile = await imageCompression(file, compressionOptions);

    console.log(
      "✅ Image processed:",
      processedFile.name,
      processedFile.type,
      processedFile.size,
      "Original:",
      file.size,
      "Reduction:",
      Math.round(((file.size - processedFile.size) / file.size) * 100) + "%"
    );

    return processedFile;
  } catch (error) {
    console.error("❌ Error processing image:", error);
    return file;
  }
}
