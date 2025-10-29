import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DeleteSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteSuccessModal({
  isOpen,
  onClose,
}: DeleteSuccessModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>Project Deleted</DialogTitle>
        <DialogDescription>
          The project was successfully deleted.
        </DialogDescription>
        <div className="flex justify-end mt-6">
          <Button onClick={onClose}>OK</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
