exports.extractId = (string) => {
  return string.slice(1).split('.')[0];
}

exports.extractBackgroundUrl = (string) => {
  return string.slice(4, -1).replace(/["']/g, '');
}
