export const createInitialUsers = async () => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-users`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    console.log('Resultado da criação de usuários:', data);
    return data;
  } catch (error) {
    console.error('Erro ao criar usuários:', error);
    throw error;
  }
};
