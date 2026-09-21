// Rebuild only the source marker. Never retain arbitrary XMP, EXIF or GPS data.
export function imageProvenanceXmp(xmp?: Buffer, generated = false) {
  const kind = generated ? "trainedAlgorithmicMedia" : xmp?.toString("utf8").match(/https?:\/\/cv\.iptc\.org\/newscodes\/digitalsourcetype\/(trainedAlgorithmicMedia|compositeSynthetic|algorithmicMedia)\b/)?.[1];
  return kind ? `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/"><Iptc4xmpExt:DigitalSourceType>http://cv.iptc.org/newscodes/digitalsourcetype/${kind}</Iptc4xmpExt:DigitalSourceType></rdf:Description></rdf:RDF></x:xmpmeta>` : undefined;
}
