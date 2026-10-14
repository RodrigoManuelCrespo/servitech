-- DropForeignKey
ALTER TABLE "HistorialEstado" DROP CONSTRAINT "HistorialEstado_usuarioId_fkey";

-- AlterTable
ALTER TABLE "HistorialEstado" ALTER COLUMN "usuarioId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "HistorialEstado" ADD CONSTRAINT "HistorialEstado_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

