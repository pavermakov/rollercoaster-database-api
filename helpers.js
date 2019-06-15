exports.extractId = (string) => {
  return string.slice(1).split('.')[0];
}

exports.extractBackgroundUrl = (string) => {
  return string.slice(4, -1).replace(/["']/g, '');
}

exports.formatProperty = (property) => {
  let parts = property.split(' ')
    .map(part => `${part.slice(0, 1).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join('');

  return `${parts.slice(0, 1).toLowerCase()}${parts.slice(1)}`;
};
