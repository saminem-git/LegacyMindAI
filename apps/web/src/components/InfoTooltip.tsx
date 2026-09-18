import { Info } from 'lucide-react';

export default function InfoTooltip({ text }: { text: string }) {
    return (
        <span className="info-tooltip" tabIndex={0} aria-label={text}>
            <Info size={13} aria-hidden="true" />
            <span className="info-tooltip__content" role="tooltip">{text}</span>
        </span>
    );
}
