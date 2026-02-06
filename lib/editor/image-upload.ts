export async function uploadImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      const base64 = reader.result as string;
      resolve(base64);
    };
    
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function validateImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 15 * 1024 * 1024; // 15MB

  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
  }

  if (file.size > maxSize) {
    throw new Error('File is too large. Maximum size is 15MB.');
  }

  return true;
}
