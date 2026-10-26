// Source: nestjs/src/interface/mcp-access/mcp.service.ts
// Revision: 59bd79378d035aeccd6e67c52a1762543d0e4c1d
// Selected teaching excerpt; surrounding authentication remains required.
  private async queryWords(p: Principal, a: any, tx: Transaction) {
    const where: any = { userId: p.user_id };
    if (a.keyword)
      where.englishWord = {
        [Op.like]: `%${a.keyword.replace(/[\\%_]/g, '\\$&')}%`,
      };
    const { rows, count } = await english.findAndCountAll({
      where,
      order: [['id', 'DESC']],
      limit: a.limit ?? 20,
      offset: a.offset ?? 0,
      transaction: tx,
      logging: false,
    });
    return {
      items: rows.map((w) => w.get({ plain: true })),
      total: count,
      limit: a.limit ?? 20,
      offset: a.offset ?? 0,
    };
  }
