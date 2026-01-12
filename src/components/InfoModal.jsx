import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "framer-motion";

export default function InfoModal({ onClose }) {
  return (
    <Dialog.Root open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal container={document.body}>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[9998]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[9999]
          w-[90vw] max-w-[500px] rounded-2xl bg-white border border-slate-200
          p-6 shadow-[0_10px_40px_rgba(0,0,0,0.2)]
          -translate-x-1/2 -translate-y-1/2"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Dialog.Title className="text-lg font-semibold text-slate-800 mb-3">
              About this Map
            </Dialog.Title>
            <Dialog.Description className="text-sm text-slate-600 leading-relaxed">
              This interactive map visualizes global indicators that directly
              impact starvation.
              <br />
              <br />
              Data sources include FAO, World Bank, and UN datasets. Each
              country’s color represents the most recent available data for the
              selected indicator.
              <br />
              <br />
              You can access the complete report and detailed methodology{" "}
              <a
                href="/StarvationReport.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                here
              </a>
              .
              <br />
              <br />
              Developed by{" "}
              <a
                href="https://www.victorsales.com.br"
                target="_blank"
                rel="noopener noreferrer"
              >
                <b>Victor Sales</b>
              </a>{" "}
              and{" "}
              <a
                href="https://www.linkedin.com/in/valentina-serrano-muñoz-996714245"
                target="_blank"
                rel="noopener noreferrer"
              >
                <b>Valentina Serrano-Muñoz</b>
              </a>
            </Dialog.Description>

            <div className="flex justify-end mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-[#2563eb] text-white rounded-lg hover:bg-[#1d4ed8] transition"
              >
                Close
              </button>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
