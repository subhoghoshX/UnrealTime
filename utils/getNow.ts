export default function getNow() {
  const d = new Date();

  return `${d.getHours()}:${d.getMinutes()}`;
}
