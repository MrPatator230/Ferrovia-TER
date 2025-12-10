const path = await import('path');
const { fileURLToPath } = await import('url');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.default.dirname(__filename);

const dbModule = await import(new URL('../src/lib/db.js', import.meta.url));
const pool = dbModule.default;

function generateSerie(){
  const n = Math.floor(Math.random() * 100000);
  return String(n).padStart(5, '0');
}

async function existsNumeroSerie(numero){
  const [rows] = await pool.query('SELECT 1 FROM materiel_roulant WHERE numero_serie = ? LIMIT 1', [numero]);
  return rows.length > 0;
}

async function generateUniqueNumero(){
  for(let i=0;i<50;i++){
    const num = generateSerie();
    const exists = await existsNumeroSerie(num);
    if(!exists) return num;
  }
  throw new Error('Unable to generate');
}

(async ()=>{
  try{
    const num = await generateUniqueNumero();
    console.log('Generated:', num);
    // insert a dummy row to test unique constraint
    const [res] = await pool.query("INSERT INTO materiel_roulant (nom, nom_technique, capacite, type_train, numero_serie) VALUES (?, ?, ?, ?, ?)", ['Test', 'Tech', 100, 'TER', num]);
    console.log('Inserted id', res.insertId);
    // try generating again, should not return the same
    const num2 = await generateUniqueNumero();
    console.log('Generated2:', num2);
    process.exit(0);
  }catch(err){
    console.error(err);
    process.exit(1);
  }
})();
