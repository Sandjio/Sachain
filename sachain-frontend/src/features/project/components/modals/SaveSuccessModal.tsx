import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SaveSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SaveSuccessModal({ isOpen, onClose }: SaveSuccessModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>Project Saved</DialogTitle>
        <DialogDescription>
          The project was Updated successfully.
        </DialogDescription>
        <div className="flex justify-end mt-6">
          <Button onClick={onClose}>OK</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
