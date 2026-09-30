module.exports = {
  reporter: {
    update(event) {
      if (event.type === 'transform_file_start') {
        console.log('Transforming:', event.filePath);
      }
    },
  },
};
