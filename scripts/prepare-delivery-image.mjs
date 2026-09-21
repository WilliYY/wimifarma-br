import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const source = process.argv[2];
if (!source) throw new Error("Informe o caminho da imagem de origem.");
const destination = "public/banners/delivery-em-casa.webp";
await mkdir("public/banners", { recursive: true });
const xmp = '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/" Iptc4xmpExt:DigitalSourceType="http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"/></rdf:RDF></x:xmpmeta>';
const result = await sharp(source).rotate().resize({ width: 1280, withoutEnlargement: true }).withXmp(xmp).webp({ quality: 82, effort: 6 }).toFile(destination);
console.log(JSON.stringify({ destination, width: result.width, height: result.height, bytes: result.size }));
