# IRS notice orientation map

This is an orientation aid for the `respond-to-your-irs-notice` Skill. It is
general information. The exact notice, printed response date, current IRS
guidance, and the user's facts control.

Official starting point:
https://www.irs.gov/individuals/understanding-your-irs-notice-or-letter

## Common tracks

### Balance and collection

- CP14 commonly begins the balance-due notice sequence.
- CP501 and CP503 are later balance reminders.
- CP504 is an intent-to-levy notice that can affect certain property, including
  a state tax refund. It is not a substitute for reading any later final notice.
- LT11, Letter 1058, and CP90 can carry Collection Due Process rights and a
  short request window.

Never infer that the user has appeal rights or a particular number of days from
the code name alone. Read the exact notice and verify the printed date.

### Underreporter and deficiency

- CP2000 generally proposes a change after IRS matching identifies a difference
  between a return and third-party information. It is not itself a tax bill or
  an audit determination.
- CP3219A is a statutory notice of deficiency. A Tax Court petition deadline is
  statutory and needs immediate verification from the actual notice.

Common mismatch issues include missing securities or digital-asset basis,
gross Form 1099-K reporting, duplicate information returns, and payments
credited to the wrong period. These are possibilities, not assumptions.

## Evidence checklist

- exact notice or letter code;
- date printed on the notice;
- stated respond-by or pay-by date;
- tax year and form involved;
- amount proposed or billed;
- relevant filed return and schedules;
- information returns and basis records;
- payment confirmations and IRS account transcript; and
- proof of delivery for any response.

Do not put identifiers or documents into the connector.
