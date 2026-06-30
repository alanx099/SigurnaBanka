const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const config = require("../../config");

module.exports = function createApi(pool) {
  const router = require("express").Router();
  const asyncRoute = (handler) => (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);

  function tokenFor(user) {
    return jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn },
    );
  }

  function authenticate(req, res, next) {
    const value = req.headers.authorization || "";
    if (!value.startsWith("Bearer "))
      return res
        .status(401)
        .json({ message: "Za pristup je potrebna prijava." });
    try {
      req.user = jwt.verify(value.slice(7), config.jwtSecret);
      next();
    } catch (_error) {
      res
        .status(401)
        .json({ message: "Sesija je istekla ili token nije valjan." });
    }
  }

  function adminOnly(req, res, next) {
    if (req.user.role !== "ADMIN")
      return res
        .status(403)
        .json({ message: "Nemate administratorske ovlasti." });
    next();
  }

  const cleanEmail = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();
  const publicUser = `id, email, first_name, last_name, role, active, created_at`;

  router.post(
    "/auth/register",
    asyncRoute(async (req, res) => {
      const email = cleanEmail(req.body.email);
      const { password, firstName, lastName } = req.body;
      if (!email || !/^\S+@\S+\.\S+$/.test(email))
        return res
          .status(400)
          .json({ message: "Unesite ispravnu e-mail adresu." });
      if (!password || password.length < 8)
        return res
          .status(400)
          .json({ message: "Lozinka mora imati najmanje 8 znakova." });
      if (!firstName?.trim() || !lastName?.trim())
        return res.status(400).json({ message: "Ime i prezime su obavezni." });
      const exists = await pool.query("SELECT 1 FROM users WHERE email = $1", [
        email,
      ]);
      if (exists.rowCount)
        return res
          .status(409)
          .json({ message: "Korisnik s ovom e-mail adresom već postoji." });
      const hash = await bcrypt.hash(password, 12);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await client.query(
          `INSERT INTO users (email,password_hash,first_name,last_name) VALUES ($1,$2,$3,$4) RETURNING ${publicUser}`,
          [email, hash, firstName.trim(), lastName.trim()],
        );
        const user = result.rows[0];
        const iban = `HR132484008${String(user.id).padStart(10, "0")}`;
        const account = await client.query(
          `INSERT INTO accounts (user_id,iban,name,type,balance) VALUES ($1,$2,'Glavni račun','GIRO',0) RETURNING *`,
          [user.id, iban],
        );
        await client.query("COMMIT");
        res
          .status(201)
          .json({ user, account: account.rows[0], token: tokenFor(user) });
      } catch (error) {
        await client.query("ROLLBACK");
        if (error.code === "23505")
          return res
            .status(409)
            .json({ message: "Korisnik s ovom e-mail adresom već postoji." });
        throw error;
      } finally {
        client.release();
      }
    }),
  );

  router.post(
    "/auth/login",
    asyncRoute(async (req, res) => {
      const email = cleanEmail(req.body.email);
      const result = await pool.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);
      if (!result.rowCount)
        return res
          .status(401)
          .json({ message: "Korisničko ime nije pronađeno." });
      const user = result.rows[0];
      if (
        !(await bcrypt.compare(
          String(req.body.password || ""),
          user.password_hash,
        ))
      ) {
        return res.status(401).json({ message: "Lozinka nije ispravna." });
      }
      if (!user.active)
        return res
          .status(403)
          .json({ message: "Korisnički račun je deaktiviran." });
      const { password_hash, ...safeUser } = user;
      res.json({ user: safeUser, token: tokenFor(user) });
    }),
  );

  router.get(
    "/auth/me",
    authenticate,
    asyncRoute(async (req, res) => {
      const result = await pool.query(
        `SELECT ${publicUser} FROM users WHERE id = $1`,
        [req.user.sub],
      );
      if (!result.rowCount)
        return res.status(404).json({ message: "Korisnik nije pronađen." });
      res.json(result.rows[0]);
    }),
  );

  router.use(authenticate);

  router.get(
    "/users",
    adminOnly,
    asyncRoute(async (_req, res) => {
      const result = await pool.query(
        `SELECT ${publicUser} FROM users ORDER BY created_at DESC`,
      );
      res.json(result.rows);
    }),
  );

  router.get(
    "/users/:id",
    asyncRoute(async (req, res) => {
      if (
        req.user.role !== "ADMIN" &&
        Number(req.params.id) !== Number(req.user.sub)
      )
        return res.status(403).json({ message: "Pristup odbijen." });
      const result = await pool.query(
        `SELECT ${publicUser} FROM users WHERE id = $1`,
        [req.params.id],
      );
      if (!result.rowCount)
        return res.status(404).json({ message: "Korisnik nije pronađen." });
      res.json(result.rows[0]);
    }),
  );

  router.patch(
    "/users/:id",
    adminOnly,
    asyncRoute(async (req, res) => {
      const { role, active, firstName, lastName } = req.body;
      if (role && !["USER", "ADMIN"].includes(role))
        return res.status(400).json({ message: "Nepoznata uloga." });
      const result = await pool.query(
        `UPDATE users SET role=COALESCE($1,role), active=COALESCE($2,active), first_name=COALESCE($3,first_name), last_name=COALESCE($4,last_name)
       WHERE id=$5 RETURNING ${publicUser}`,
        [
          role ?? null,
          active ?? null,
          firstName?.trim() || null,
          lastName?.trim() || null,
          req.params.id,
        ],
      );
      if (!result.rowCount)
        return res.status(404).json({ message: "Korisnik nije pronađen." });
      res.json(result.rows[0]);
    }),
  );

  router.delete(
    "/users/:id",
    adminOnly,
    asyncRoute(async (req, res) => {
      if (Number(req.params.id) === Number(req.user.sub))
        return res
          .status(400)
          .json({ message: "Ne možete obrisati vlastiti profil." });
      const result = await pool.query("DELETE FROM users WHERE id=$1", [
        req.params.id,
      ]);
      if (!result.rowCount)
        return res.status(404).json({ message: "Korisnik nije pronađen." });
      res.status(204).send();
    }),
  );

  router.get(
    "/accounts",
    asyncRoute(async (req, res) => {
      const params = [];
      const where = req.user.role === "ADMIN" ? "" : "WHERE a.user_id=$1";
      if (where) params.push(req.user.sub);
      const result = await pool.query(
        `SELECT a.*, u.first_name, u.last_name, u.email FROM accounts a JOIN users u ON u.id=a.user_id ${where} ORDER BY a.created_at DESC`,
        params,
      );
      res.json(result.rows);
    }),
  );

  router.post(
    "/accounts",
    adminOnly,
    asyncRoute(async (req, res) => {
      const { userId, iban, name, type, balance, currency } = req.body;
      if (!userId || !iban?.trim() || !name?.trim())
        return res
          .status(400)
          .json({ message: "Vlasnik, IBAN i naziv su obavezni." });
      const result = await pool.query(
        `INSERT INTO accounts (user_id,iban,name,type,balance,currency) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [
          userId,
          iban.replace(/\s/g, "").toUpperCase(),
          name.trim(),
          type || "CURRENT",
          balance || 0,
          currency || "EUR",
        ],
      );
      res.status(201).json(result.rows[0]);
    }),
  );

  router.get(
    "/accounts/:id",
    asyncRoute(async (req, res) => {
      const result = await pool.query(
        `SELECT a.*,u.first_name,u.last_name,u.email FROM accounts a JOIN users u ON u.id=a.user_id WHERE a.id=$1`,
        [req.params.id],
      );
      if (!result.rowCount)
        return res.status(404).json({ message: "Račun nije pronađen." });
      if (
        req.user.role !== "ADMIN" &&
        Number(result.rows[0].user_id) !== Number(req.user.sub)
      )
        return res.status(403).json({ message: "Pristup odbijen." });
      res.json(result.rows[0]);
    }),
  );

  router.patch(
    "/accounts/:id",
    asyncRoute(async (req, res) => {
      const current = await pool.query("SELECT * FROM accounts WHERE id=$1", [
        req.params.id,
      ]);
      if (!current.rowCount)
        return res.status(404).json({ message: "Račun nije pronađen." });
      const account = current.rows[0];
      if (
        req.user.role !== "ADMIN" &&
        Number(account.user_id) !== Number(req.user.sub)
      )
        return res.status(403).json({ message: "Pristup odbijen." });
      const { name, type, status } = req.body;
      if (req.user.role !== "ADMIN" && (type || status))
        return res
          .status(403)
          .json({ message: "Samo administrator mijenja vrstu ili status." });
      const result = await pool.query(
        `UPDATE accounts SET name=COALESCE($1,name),type=COALESCE($2,type),status=COALESCE($3,status) WHERE id=$4 RETURNING *`,
        [name?.trim() || null, type || null, status || null, req.params.id],
      );
      res.json(result.rows[0]);
    }),
  );

  router.delete(
    "/accounts/:id",
    adminOnly,
    asyncRoute(async (req, res) => {
      const result = await pool.query("DELETE FROM accounts WHERE id=$1", [
        req.params.id,
      ]);
      if (!result.rowCount)
        return res.status(404).json({ message: "Račun nije pronađen." });
      res.status(204).send();
    }),
  );

  // ---------------- ACCOUNT OPENING REQUESTS ----------------
  router.get(
    "/account-requests",
    asyncRoute(async (req, res) => {
      const params = [];
      const where = req.user.role === "ADMIN" ? "" : "WHERE r.user_id=$1";
      if (where) params.push(req.user.sub);
      const result = await pool.query(
        `SELECT r.*, u.first_name, u.last_name, u.email,
              reviewer.first_name AS reviewer_first_name, reviewer.last_name AS reviewer_last_name
       FROM account_requests r
       JOIN users u ON u.id=r.user_id
       LEFT JOIN users reviewer ON reviewer.id=r.reviewed_by
       ${where}
       ORDER BY CASE WHEN r.status='PENDING' THEN 0 ELSE 1 END, r.created_at DESC`,
        params,
      );
      res.json(result.rows);
    }),
  );

  router.post(
    "/account-requests",
    asyncRoute(async (req, res) => {
      const { accountType, requestedName, userMessage } = req.body;
      const allowedTypes = ["CURRENT", "GIRO", "SAVINGS", "BUSINESS"];
      if (!allowedTypes.includes(accountType))
        return res
          .status(400)
          .json({ message: "Odaberite valjanu vrstu računa." });
      if (!requestedName?.trim())
        return res
          .status(400)
          .json({ message: "Naziv željenog računa je obavezan." });
      try {
        const result = await pool.query(
          `INSERT INTO account_requests (user_id,account_type,requested_name,user_message)
         VALUES ($1,$2,$3,$4) RETURNING *`,
          [
            req.user.sub,
            accountType,
            requestedName.trim(),
            userMessage?.trim() || null,
          ],
        );
        res.status(201).json(result.rows[0]);
      } catch (error) {
        if (error.code === "23505")
          return res.status(409).json({
            message: "Već imate zahtjev za ovu vrstu računa koji čeka obradu.",
          });
        throw error;
      }
    }),
  );

  router.get(
    "/account-requests/:id",
    asyncRoute(async (req, res) => {
      const result = await pool.query(
        `SELECT r.*,u.first_name,u.last_name,u.email FROM account_requests r
       JOIN users u ON u.id=r.user_id WHERE r.id=$1`,
        [req.params.id],
      );
      if (!result.rowCount)
        return res.status(404).json({ message: "Zahtjev nije pronađen." });
      if (
        req.user.role !== "ADMIN" &&
        Number(result.rows[0].user_id) !== Number(req.user.sub)
      )
        return res.status(403).json({ message: "Pristup odbijen." });
      res.json(result.rows[0]);
    }),
  );

  router.patch(
    "/account-requests/:id",
    adminOnly,
    asyncRoute(async (req, res) => {
      const { action, adminMessage } = req.body;
      if (!["APPROVE", "REJECT"].includes(action))
        return res
          .status(400)
          .json({ message: "Odaberite odobrenje ili odbijanje zahtjeva." });
      if (action === "REJECT" && !adminMessage?.trim())
        return res
          .status(400)
          .json({ message: "Kod odbijanja je obavezno napisati razlog." });
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const found = await client.query(
          "SELECT * FROM account_requests WHERE id=$1 FOR UPDATE",
          [req.params.id],
        );
        if (!found.rowCount) {
          await client.query("ROLLBACK");
          return res.status(404).json({ message: "Zahtjev nije pronađen." });
        }
        const request = found.rows[0];
        if (request.status !== "PENDING") {
          await client.query("ROLLBACK");
          return res.status(409).json({ message: "Zahtjev je već obrađen." });
        }

        let account = null;
        if (action === "APPROVE") {
          const iban = `HR122484008${String(request.id).padStart(10, "0")}`;
          const created = await client.query(
            `INSERT INTO accounts (user_id,iban,name,type,balance) VALUES ($1,$2,$3,$4,0) RETURNING *`,
            [
              request.user_id,
              iban,
              request.requested_name,
              request.account_type,
            ],
          );
          account = created.rows[0];
        }
        const updated = await client.query(
          `UPDATE account_requests SET status=$1,admin_message=$2,reviewed_by=$3,reviewed_at=NOW(),created_account_id=$4
         WHERE id=$5 RETURNING *`,
          [
            action === "APPROVE" ? "APPROVED" : "REJECTED",
            adminMessage?.trim() || "Zahtjev je odobren.",
            req.user.sub,
            account?.id || null,
            req.params.id,
          ],
        );
        await client.query("COMMIT");
        res.json({ request: updated.rows[0], account });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }),
  );

  // ---------------- INTERNAL TRANSFERS ----------------
  router.get(
    "/transfer-recipients",
    asyncRoute(async (req, res) => {
      const result = await pool.query(
        `SELECT u.id,u.first_name,u.last_name,u.email,
              json_agg(json_build_object('id',a.id,'name',a.name,'iban',a.iban,'type',a.type) ORDER BY a.name) AS accounts
       FROM users u JOIN accounts a ON a.user_id=u.id AND a.status='ACTIVE'
       WHERE u.active=TRUE AND u.id<>$1
       GROUP BY u.id,u.first_name,u.last_name,u.email ORDER BY u.first_name,u.last_name`,
        [req.user.sub],
      );
      res.json(result.rows);
    }),
  );

  router.get(
    "/transfers",
    asyncRoute(async (req, res) => {
      const params = [];
      let where = "";
      if (req.user.role !== "ADMIN") {
        params.push(req.user.sub);
        where = "WHERE sa.user_id=$1 OR ra.user_id=$1";
      }
      const result = await pool.query(
        `SELECT t.*,sa.user_id AS sender_user_id,ra.user_id AS recipient_user_id,
              sa.iban AS sender_iban,sa.name AS sender_account_name,su.first_name AS sender_first_name,su.last_name AS sender_last_name,
              ra.iban AS recipient_iban,ra.name AS recipient_account_name,ru.first_name AS recipient_first_name,ru.last_name AS recipient_last_name
       FROM transfers t JOIN accounts sa ON sa.id=t.sender_account_id JOIN users su ON su.id=sa.user_id
       JOIN accounts ra ON ra.id=t.recipient_account_id JOIN users ru ON ru.id=ra.user_id
       ${where} ORDER BY t.created_at DESC`,
        params,
      );
      res.json(result.rows);
    }),
  );

  router.post(
    "/transfers",
    asyncRoute(async (req, res) => {
      const { senderAccountId, recipientAccountId, amount, description } =
        req.body;
      const numericAmount = Number(amount);
      if (
        !senderAccountId ||
        !recipientAccountId ||
        Number(senderAccountId) === Number(recipientAccountId)
      )
        return res
          .status(400)
          .json({ message: "Odaberite dva različita računa." });
      if (!Number.isFinite(numericAmount) || numericAmount <= 0)
        return res
          .status(400)
          .json({ message: "Unesite pozitivan iznos transfera." });
      if (!description?.trim())
        return res.status(400).json({ message: "Opis plaćanja je obavezan." });
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const locked = await client.query(
          `SELECT a.*,u.first_name,u.last_name FROM accounts a JOIN users u ON u.id=a.user_id
         WHERE a.id=ANY($1::bigint[]) ORDER BY a.id FOR UPDATE OF a`,
          [[senderAccountId, recipientAccountId]],
        );
        const sender = locked.rows.find(
          (a) => Number(a.id) === Number(senderAccountId),
        );
        const recipient = locked.rows.find(
          (a) => Number(a.id) === Number(recipientAccountId),
        );
        if (!sender || !recipient) {
          await client.query("ROLLBACK");
          return res
            .status(404)
            .json({ message: "Odabrani račun nije pronađen." });
        }
        if (Number(sender.user_id) !== Number(req.user.sub)) {
          await client.query("ROLLBACK");
          return res
            .status(403)
            .json({ message: "Možete slati samo sa svojeg računa." });
        }
        if (Number(recipient.user_id) === Number(req.user.sub)) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            message:
              "Za prijenos između vlastitih računa odaberite internu preraspodjelu.",
          });
        }
        if (sender.status !== "ACTIVE" || recipient.status !== "ACTIVE") {
          await client.query("ROLLBACK");
          return res
            .status(409)
            .json({ message: "Jedan od računa nije aktivan." });
        }
        if (sender.currency !== recipient.currency) {
          await client.query("ROLLBACK");
          return res
            .status(409)
            .json({ message: "Računi moraju koristiti istu valutu." });
        }
        if (Number(sender.balance) < numericAmount) {
          await client.query("ROLLBACK");
          return res
            .status(409)
            .json({ message: "Nedovoljno sredstava na računu." });
        }
        const transfer = await client.query(
          `INSERT INTO transfers (sender_account_id,recipient_account_id,amount,description) VALUES ($1,$2,$3,$4) RETURNING *`,
          [
            senderAccountId,
            recipientAccountId,
            numericAmount,
            description.trim(),
          ],
        );
        const reference = `TRF-${transfer.rows[0].id}`;
        await client.query(
          "UPDATE accounts SET balance=balance-$1 WHERE id=$2",
          [numericAmount, senderAccountId],
        );
        await client.query(
          "UPDATE accounts SET balance=balance+$1 WHERE id=$2",
          [numericAmount, recipientAccountId],
        );
        await client.query(
          `INSERT INTO withdrawals (account_id,amount,description,reference) VALUES ($1,$2,$3,$4)`,
          [
            senderAccountId,
            numericAmount,
            `${description.trim()} · za ${recipient.first_name} ${recipient.last_name}`,
            reference,
          ],
        );
        await client.query(
          `INSERT INTO deposits (account_id,amount,description,reference) VALUES ($1,$2,$3,$4)`,
          [
            recipientAccountId,
            numericAmount,
            `${description.trim()} · od ${sender.first_name} ${sender.last_name}`,
            reference,
          ],
        );
        await client.query("COMMIT");
        res.status(201).json(transfer.rows[0]);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }),
  );

  async function listMovements(table, req, res) {
    const params = [];
    let where = "";
    if (req.user.role !== "ADMIN") {
      where = "WHERE a.user_id=$1";
      params.push(req.user.sub);
    }
    if (req.query.accountId) {
      params.push(req.query.accountId);
      where += `${where ? " AND" : " WHERE"} m.account_id=$${params.length}`;
    }
    const result = await pool.query(
      `SELECT m.*,a.iban,a.name AS account_name FROM ${table} m JOIN accounts a ON a.id=m.account_id ${where} ORDER BY m.created_at DESC`,
      params,
    );
    res.json(result.rows);
  }

  const movementDetail = (table) =>
    asyncRoute(async (req, res) => {
      const result = await pool.query(
        `SELECT m.*,a.iban,a.name AS account_name,a.user_id FROM ${table} m JOIN accounts a ON a.id=m.account_id WHERE m.id=$1`,
        [req.params.id],
      );
      if (!result.rowCount)
        return res.status(404).json({ message: "Stavka nije pronađena." });
      if (
        req.user.role !== "ADMIN" &&
        Number(result.rows[0].user_id) !== Number(req.user.sub)
      )
        return res.status(403).json({ message: "Pristup odbijen." });
      res.json(result.rows[0]);
    });

  router.get(
    "/deposits",
    asyncRoute((req, res) => listMovements("deposits", req, res)),
  );
  router.get("/deposits/:id", movementDetail("deposits"));
  router.get(
    "/withdrawals",
    asyncRoute((req, res) => listMovements("withdrawals", req, res)),
  );
  router.get("/withdrawals/:id", movementDetail("withdrawals"));

  async function createMovement(table, direction, req, res) {
    const { accountId, amount, description, reference } = req.body;
    const numericAmount = Number(amount);
    if (!accountId || !Number.isFinite(numericAmount) || numericAmount <= 0)
      return res
        .status(400)
        .json({ message: "Račun i pozitivan iznos su obavezni." });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const found = await client.query(
        "SELECT * FROM accounts WHERE id=$1 FOR UPDATE",
        [accountId],
      );
      if (!found.rowCount) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Račun nije pronađen." });
      }
      const account = found.rows[0];
      if (
        req.user.role !== "ADMIN" &&
        Number(account.user_id) !== Number(req.user.sub)
      ) {
        await client.query("ROLLBACK");
        return res.status(403).json({ message: "Pristup odbijen." });
      }
      if (account.status !== "ACTIVE") {
        await client.query("ROLLBACK");
        return res.status(409).json({ message: "Račun nije aktivan." });
      }
      if (direction < 0 && Number(account.balance) < numericAmount) {
        await client.query("ROLLBACK");
        return res
          .status(409)
          .json({ message: "Nedovoljno sredstava na računu." });
      }
      const movement = await client.query(
        `INSERT INTO ${table} (account_id,amount,description,reference) VALUES ($1,$2,$3,$4) RETURNING *`,
        [
          accountId,
          numericAmount,
          description?.trim() || null,
          reference?.trim() || null,
        ],
      );
      await client.query("UPDATE accounts SET balance=balance+$1 WHERE id=$2", [
        direction * numericAmount,
        accountId,
      ]);
      await client.query("COMMIT");
      res.status(201).json(movement.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  router.post(
    "/deposits",
    asyncRoute((req, res) => createMovement("deposits", 1, req, res)),
  );
  router.post(
    "/withdrawals",
    asyncRoute((req, res) => createMovement("withdrawals", -1, req, res)),
  );

  router.get(
    "/dashboard",
    asyncRoute(async (req, res) => {
      const userId =
        req.user.role === "ADMIN" && req.query.userId
          ? req.query.userId
          : req.user.sub;
      const accounts = await pool.query(
        "SELECT * FROM accounts WHERE user_id=$1 ORDER BY created_at",
        [userId],
      );
      const ids = accounts.rows.map((a) => a.id);
      let recent = [];
      if (ids.length) {
        const movements = await pool.query(
          `SELECT * FROM (
          SELECT id,account_id,amount,description,created_at,'DEPOSIT' AS kind FROM deposits WHERE account_id=ANY($1)
          UNION ALL SELECT id,account_id,amount,description,created_at,'WITHDRAWAL' AS kind FROM withdrawals WHERE account_id=ANY($1)
        ) activity ORDER BY created_at DESC LIMIT 8`,
          [ids],
        );
        recent = movements.rows;
      }
      res.json({ accounts: accounts.rows, recent });
    }),
  );

  return router;
};
