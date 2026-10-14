-- AlterTable
ALTER TABLE "Reparacion" ADD COLUMN     "linkToken" TEXT,
ADD COLUMN     "mensajePresupuesto" TEXT,
ADD COLUMN     "montoPresupuesto" DECIMAL(10,2);

-- CreateIndex
CREATE UNIQUE INDEX "Reparacion_linkToken_key" ON "Reparacion"("linkToken");

