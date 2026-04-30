export type MemberLink = {
  id: string
  label: string
}

export type StatementFundRow = {
  id: string
  amount: number
  receivedFrom: string
  paymentMode: "CASH" | "GPAY" | "BANK_ACCOUNT"
  fundDate: Date
}

export type StatementExpenseRow = {
  id: string
  amount: number
  description: string | null
  title: string
  createdAt: Date
  createdById: string
}

export function buildMemberLinks(
  members: Array<{ id: string; name: string | null; email: string }>
): MemberLink[] {
  return members
    .map((member) => ({
      id: member.id,
      label: member.name?.trim() || member.email.trim(),
    }))
    .filter((member) => member.label.length > 0)
    .sort((left, right) => right.label.length - left.label.length)
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function findFirstMention(text: string, members: MemberLink[]) {
  let best: { index: number; length: number; id: string; label: string; matchedText: string } | null = null

  for (const member of members) {
    const matcher = new RegExp(`\\b${escapeRegExp(member.label)}\\b`, "i")
    const match = matcher.exec(text)

    if (!match) {
      continue
    }

    if (!best || match.index < best.index || (match.index === best.index && match[0].length > best.length)) {
      best = {
        index: match.index,
        length: match[0].length,
        id: member.id,
        label: member.label,
        matchedText: match[0],
      }
    }
  }

  return best
}

function extractExpenseIdFromFundLabel(receivedFrom: string) {
  const match = receivedFrom.match(/from expense\s+([^\s]+)$/i)
  return match?.[1] ?? null
}

export function buildStatementCollectionRows({
  memberId,
  memberLinks,
  funds,
  expenses,
}: {
  memberId: string
  memberLinks: MemberLink[]
  funds: StatementFundRow[]
  expenses: StatementExpenseRow[]
}) {
  const rows = [...funds]
  const referencedExpenseIds = new Set<string>()

  for (const fund of funds) {
    const referencedExpenseId = extractExpenseIdFromFundLabel(fund.receivedFrom)

    if (referencedExpenseId) {
      referencedExpenseIds.add(referencedExpenseId)
    }
  }

  for (const expense of expenses) {
    if (expense.createdById === memberId || referencedExpenseIds.has(expense.id)) {
      continue
    }

    const sourceText = expense.description?.trim() || expense.title.trim()
    if (!sourceText) {
      continue
    }

    const mention = findFirstMention(sourceText, memberLinks)
    if (!mention || mention.id !== memberId) {
      continue
    }

    rows.push({
      id: `expense-${expense.id}`,
      amount: expense.amount,
      receivedFrom: sourceText,
      paymentMode: "CASH",
      fundDate: expense.createdAt,
    })
  }

  return rows.sort((left, right) => {
    const diff = new Date(left.fundDate).getTime() - new Date(right.fundDate).getTime()
    return diff !== 0 ? diff : left.id.localeCompare(right.id)
  })
}
