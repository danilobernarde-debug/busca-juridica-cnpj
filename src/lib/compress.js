const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.75;

export async function comprimirImagem(file) {
  if (!file.type.startsWith('image/')) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (!blob) { resolve(file); return; }
        const nomeBase = file.name.replace(/\.[^.]+$/, '');
        resolve(new File([blob], `${nomeBase}.jpg`, { type: 'image/jpeg' }));
      }, 'image/jpeg', JPEG_QUALITY);
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}
