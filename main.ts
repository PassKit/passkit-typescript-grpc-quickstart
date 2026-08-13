import minimist from 'minimist';
import QuickStartCoupons from './quickstarts/QuickstartCoupons.js';
import QuickStartEventTickets from './quickstarts/QuickstartEventTickets.js';
import QuickStartFlights from './quickstarts/QuickstartFlights.js';
import QuickStartLoyalty from './quickstarts/QuickstartLoyalty.js';

type Quickstart = { runQuickStart(): Promise<void>; cleanUp(): Promise<void> };

const choices: Record<string, () => Quickstart> = {
    loyalty: () => new QuickStartLoyalty(),
    coupons: () => new QuickStartCoupons(),
    'event-tickets': () => new QuickStartEventTickets(),
    flights: () => new QuickStartFlights(),
};

async function run(name: string, keep: boolean): Promise<void> {
    const factory = choices[name];
    if (!factory) throw new Error(`Unknown quickstart "${name}". Choose loyalty, coupons, event-tickets, flights, or all.`);
    const quickstart = factory();
    await quickstart.runQuickStart();
    if (!keep) await quickstart.cleanUp();
}

async function main(): Promise<void> {
    const args = minimist(process.argv.slice(2), {
        boolean: ['keep'],
        string: ['quickstart'],
        default: { quickstart: 'all', keep: false },
    });
    const selected = args.quickstart === 'all' ? Object.keys(choices) : [args.quickstart];
    for (const name of selected) await run(name, args.keep);
}

main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
