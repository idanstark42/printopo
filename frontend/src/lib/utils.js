export function colorToHex(colorStr) {
  if (!colorStr) return '#000000'
  if (colorStr.startsWith('#')) {
    if (colorStr.length === 4) return '#' + colorStr[1] + colorStr[1] + colorStr[2] + colorStr[2] + colorStr[3] + colorStr[3]
    return colorStr.substring(0, 7)
  }
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = colorStr
  const computed = ctx.fillStyle
  return computed.startsWith('#') ? computed.substring(0, 7) : '#000000'
}