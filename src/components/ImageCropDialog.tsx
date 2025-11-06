import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Slider } from './ui/slider';

interface ImageCropDialogProps {
  image: string;
  open: boolean;
  onClose: () => void;
  onCropComplete: (croppedImage: Blob) => void;
}

export const ImageCropDialog = ({ 
  image, 
  open, 
  onClose, 
  onCropComplete 
}: ImageCropDialogProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropCompleteCallback = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createCroppedImage = async () => {
    try {
      if (!croppedAreaPixels) return;
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      onCropComplete(croppedImage);
      onClose();
    } catch (e) {
      console.error('Error cropping image:', e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card border-primary/20">
        <DialogHeader>
          <DialogTitle>Ajustar Foto</DialogTitle>
        </DialogHeader>
        
        <div className="relative h-[400px] bg-black rounded-lg overflow-hidden">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropCompleteCallback}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Zoom</label>
          <Slider
            value={[zoom]}
            onValueChange={(value) => setZoom(value[0])}
            min={1}
            max={3}
            step={0.1}
          />
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={createCroppedImage}>
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('No 2d context');

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Falha ao processar imagem'));
        return;
      }
      resolve(blob);
    }, 'image/jpeg', 0.95);
  });
};

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });
