"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X, Keyboard } from "lucide-react";

interface BarcodeScannerProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (code: string) => void;
}

export function BarcodeScanner({ isOpen, onClose, onScan }: BarcodeScannerProps) {
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<"camera" | "keyboard">("camera");
    const [manualCode, setManualCode] = useState("");
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Cleanup function that doesn't setState - safe for effects
    const cleanupScanner = useCallback(async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch (err) {
                console.error("Error stopping scanner:", err);
            }
            scannerRef.current = null;
        }
    }, []);

    // Full stop including state update - for user actions
    const stopScanner = useCallback(async () => {
        await cleanupScanner();
        setIsScanning(false);
    }, [cleanupScanner]);

    const startScanner = useCallback(async () => {
        if (!containerRef.current || scannerRef.current) return;

        try {
            setError(null);
            const scanner = new Html5Qrcode("barcode-scanner-container");
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 150 },
                    aspectRatio: 1.5
                },
                (decodedText) => {
                    // Código escaneado exitosamente
                    onScan(decodedText);
                    stopScanner();
                    onClose();
                },
                () => {
                    // Error de escaneo (ignorar, es normal mientras busca)
                }
            );

            setIsScanning(true);
        } catch (err) {
            console.error("Error starting scanner:", err);
            setError("No se pudo acceder a la cámara. Verifica los permisos o usa modo manual.");
            setMode("keyboard");
        }
    }, [onScan, onClose, stopScanner]);

    useEffect(() => {
        if (isOpen && mode === "camera") {
            // Delay para asegurar que el DOM está listo
            const timer = setTimeout(startScanner, 100);
            return () => {
                clearTimeout(timer);
                cleanupScanner();
            };
        } else {
            cleanupScanner();
            setIsScanning(false);
        }
    }, [isOpen, mode, startScanner, cleanupScanner]);

    useEffect(() => {
        if (!isOpen) {
            cleanupScanner();
            setIsScanning(false);
            setManualCode("");
            setError(null);
        }
    }, [isOpen, cleanupScanner]);

    // Modo teclado: capturar entrada de lectora USB
    useEffect(() => {
        if (!isOpen || mode !== "keyboard") return;

        let buffer = "";
        let timeout: NodeJS.Timeout;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Las lectoras USB envían caracteres rápidamente seguidos de Enter
            if (e.key === "Enter" && buffer.length > 0) {
                onScan(buffer);
                buffer = "";
                onClose();
                return;
            }

            // Solo caracteres imprimibles
            if (e.key.length === 1) {
                buffer += e.key;

                // Limpiar buffer después de 100ms de inactividad
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    buffer = "";
                }, 100);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            clearTimeout(timeout);
        };
    }, [isOpen, mode, onScan, onClose]);

    const handleManualSubmit = () => {
        if (manualCode.trim()) {
            onScan(manualCode.trim());
            setManualCode("");
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {mode === "camera" ? (
                            <>
                                <Camera className="h-5 w-5" />
                                Escanear Código
                            </>
                        ) : (
                            <>
                                <Keyboard className="h-5 w-5" />
                                Ingresar Código
                            </>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Toggle de modo */}
                    <div className="flex gap-2">
                        <Button
                            variant={mode === "camera" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setMode("camera")}
                            className="flex-1"
                        >
                            <Camera className="h-4 w-4 mr-2" />
                            Cámara
                        </Button>
                        <Button
                            variant={mode === "keyboard" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setMode("keyboard")}
                            className="flex-1"
                        >
                            <Keyboard className="h-4 w-4 mr-2" />
                            Manual/Lectora
                        </Button>
                    </div>

                    {mode === "camera" ? (
                        <div className="space-y-3">
                            {/* Contenedor del escáner */}
                            <div
                                id="barcode-scanner-container"
                                ref={containerRef}
                                className="w-full h-64 bg-black rounded-lg overflow-hidden"
                            />

                            {error && (
                                <p className="text-sm text-red-500 text-center">{error}</p>
                            )}

                            {isScanning && (
                                <p className="text-sm text-muted-foreground text-center">
                                    Apunta la cámara al código de barras
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                Usa la lectora de códigos USB o ingresa el código manualmente:
                            </p>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={manualCode}
                                    onChange={(e) => setManualCode(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                                    placeholder="Código de barras..."
                                    className="flex-1 px-3 py-2 border rounded-md bg-background"
                                    autoFocus
                                />
                                <Button onClick={handleManualSubmit} disabled={!manualCode.trim()}>
                                    Buscar
                                </Button>
                            </div>

                            <p className="text-xs text-muted-foreground text-center">
                                💡 Si usas lectora USB, solo escanea - el código se detectará automáticamente
                            </p>
                        </div>
                    )}

                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="w-full"
                    >
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
