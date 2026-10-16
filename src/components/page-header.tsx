export default function PageHeader({
                                       title,
                                       children,
                                   }: {
    title: string;
    children?: React.ReactNode;
}) {
    return (
        <header className="flex flex-col gap-3">
            <h1 className="text-3xl sm:text-4xl">{title}</h1>
            {children && <p className="text-ink-soft">{children}</p>}
            <div className="ornament" aria-hidden="true">
                <i />
            </div>
        </header>
    );
}