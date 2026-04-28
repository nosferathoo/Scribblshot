import "@/App.css";
import Whiteboard from "@/components/Whiteboard";
import { Toaster } from "@/components/ui/sonner";

export default function App() {
  return (
    <div className="App" data-testid="app-root">
      <Whiteboard />
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
