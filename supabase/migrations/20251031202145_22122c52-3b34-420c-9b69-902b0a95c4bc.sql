-- Adicionar coluna can_complete na tabela lessons
ALTER TABLE lessons 
ADD COLUMN can_complete BOOLEAN DEFAULT false;

-- Criar índice para melhorar performance
CREATE INDEX idx_lessons_can_complete ON lessons(user_id, can_complete) WHERE can_complete = true;

-- Adicionar comentário para documentação
COMMENT ON COLUMN lessons.can_complete IS 'Indica se o usuário foi autorizado pelo Jeff Wu a concluir esta lição';
