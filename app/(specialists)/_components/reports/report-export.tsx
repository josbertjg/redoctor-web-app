'use client';

import { useState } from 'react';

import Call from '@material-symbols/svg-400/rounded/call.svg?svgr';
import Chat from '@material-symbols/svg-400/rounded/chat.svg?svgr';
import Download from '@material-symbols/svg-400/rounded/download.svg?svgr';
import Lock from '@material-symbols/svg-400/rounded/lock.svg?svgr';
import PictureAsPdf from '@material-symbols/svg-400/rounded/picture_as_pdf.svg?svgr';
import TableView from '@material-symbols/svg-400/rounded/table_view.svg?svgr';
import { useTranslations } from 'next-intl';

import { buildCsv } from '@/app/lib/reports/csv';
import type { SpecialistReport } from '@/app/lib/schemas/reports';
import { supportChannels } from '@/app/lib/support';

import { Button } from '@/app/ui/button';
import { Icon, type IconComponent } from '@/app/ui/icons';
import { Sheet } from '@/app/ui/sheet';

import { useReportCsv } from './report-csv';

type ReportExportProps = {
  report: SpecialistReport;
  /** The office's name when the report looks at one. */
  officeName: string | null;
  /** Opens the print dialog with every section laid out (the PDF). */
  onPrint: () => void;
};

/*
 * «Descargar», as the app's report screens offer it: a PDF with the charts
 * and the tables, or a spreadsheet with the figures. Viewing is never plan-
 * gated; downloading is, by the plan's `canExport`: without it the sheet
 * says so and offers support, never a plan to buy. The PDF is the
 * browser's own print to PDF of the page laid out for paper; the CSV is
 * built here, nothing is sent anywhere.
 */
export function ReportExport({
  report,
  officeName,
  onPrint,
}: ReportExportProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const csv = useReportCsv(report, officeName);

  const downloadCsv = () => {
    const blob = new Blob([buildCsv(csv.report)], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${csv.fileName}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="white"
        size="small"
        shape="soft"
        className="print:hidden"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Icon icon={Download} size={18} />
        {t('reports.export.download')}
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={
          report.canExport
            ? t('reports.export.sheetTitle')
            : t('reports.export.lockedTitle')
        }
        description={
          report.canExport ? undefined : t('reports.export.lockedDescription')
        }
      >
        {report.canExport ? (
          <ul className="flex flex-col gap-3 pb-4">
            <li>
              <ExportOption
                icon={PictureAsPdf}
                title={t('reports.export.pdfTitle')}
                description={`${t('reports.export.pdfDescription')} ${t('reports.export.pdfHint')}`}
                onClick={() => {
                  setOpen(false);
                  onPrint();
                }}
              />
            </li>
            <li>
              <ExportOption
                icon={TableView}
                title={t('reports.export.csvTitle')}
                description={t('reports.export.csvDescription')}
                onClick={downloadCsv}
              />
            </li>
          </ul>
        ) : (
          <LockedSupport />
        )}
      </Sheet>
    </>
  );
}

function ExportOption({
  icon,
  title,
  description,
  onClick,
}: {
  icon: IconComponent;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl bg-pure-white p-4 text-left shadow-md transition-[box-shadow,transform] duration-fast ease-house outline-none hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-info-light text-primary">
        <Icon icon={icon} size={24} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-title-md text-text-primary">{title}</span>
        <span className="text-body-sm text-text-secondary">{description}</span>
      </span>
    </button>
  );
}

/** The app's locked sheet: support, by WhatsApp or a call. */
function LockedSupport() {
  const t = useTranslations();
  const channels = supportChannels(t('reports.export.supportMessage'));

  return (
    <div className="flex flex-col gap-3 pb-4">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-variant text-text-secondary">
        <Icon icon={Lock} size={24} />
      </span>
      {channels.whatsapp ? (
        <Button asChild shape="soft">
          <a
            href={channels.whatsapp.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon icon={Chat} size={20} />
            {t('appAccess.whatsapp')}
          </a>
        </Button>
      ) : null}
      {channels.phones.map((phone) => (
        <Button key={phone.href} asChild variant="white" shape="soft">
          <a href={phone.href}>
            <Icon icon={Call} size={20} />
            {t('appAccess.call', { label: phone.label, number: phone.number })}
          </a>
        </Button>
      ))}
    </div>
  );
}
