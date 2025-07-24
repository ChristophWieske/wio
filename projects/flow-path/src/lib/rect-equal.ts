export function rectEqual(
  a: DOMRect | null | undefined,
  b: DOMRect | null | undefined,
) {
  return (
    a?.x === b?.x &&
    a?.y === b?.y &&
    a?.width === b?.width &&
    a?.height === b?.height
  );
}
