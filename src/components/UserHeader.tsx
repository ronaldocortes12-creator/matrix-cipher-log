import { useState, useEffect } from "react";
import { User, LogOut, Edit, Upload } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ImageCropDialog } from "./ImageCropDialog";

export const UserHeader = () => {
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [cryptoExperience, setCryptoExperience] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setProfile(data);
        setFullName(data.full_name || '');
        setAge(data.age?.toString() || '');
        setCryptoExperience(data.crypto_experience || '');
        setAvatarUrl(data.avatar_url || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const ageNum = age ? parseInt(age) : null;
      if (ageNum && (ageNum < 13 || ageNum > 120)) {
        toast({
          title: "Erro",
          description: "Idade deve estar entre 13 e 120 anos",
          variant: "destructive"
        });
        return;
      }

      if (!fullName.trim()) {
        toast({
          title: "Erro",
          description: "Nome é obrigatório",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          age: ageNum,
          crypto_experience: cryptoExperience || null,
          avatar_url: avatarUrl || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!"
      });
      
      setShowProfileDialog(false);
      loadProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar perfil",
        variant: "destructive"
      });
    }
  };

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validar tipo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Erro",
        description: "Apenas arquivos JPG, PNG ou WEBP são permitidos",
        variant: "destructive"
      });
      event.target.value = ''; // Reset input
      return;
    }
    
    // Validar tamanho (máximo 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 2MB",
        variant: "destructive"
      });
      event.target.value = ''; // Reset input
      return;
    }
    
    // Converter para URL local para o cropper
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
      setShowCropDialog(true);
    };
    reader.readAsDataURL(file);
    
    // Reset input para permitir selecionar o mesmo arquivo novamente
    event.target.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    try {
      setUploading(true);
      
      // VALIDAÇÃO 1: Verificar se blob é válido
      if (!croppedBlob || croppedBlob.size === 0) {
        console.error('❌ Blob inválido ou vazio');
        throw new Error('Imagem processada está vazia');
      }
      
      console.log('📸 Iniciando upload - Tamanho do blob:', croppedBlob.size);
      
      // VALIDAÇÃO 2: Verificar autenticação
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('❌ Erro de autenticação:', authError);
        throw new Error('Erro de autenticação');
      }
      if (!user) {
        console.error('❌ Usuário não encontrado');
        throw new Error('Usuário não autenticado');
      }
      
      console.log('✅ Usuário autenticado:', user.id);
      
      // VALIDAÇÃO 3: Criar nome do arquivo
      const fileExt = 'jpg';
      const timestamp = Date.now();
      const fileName = `${user.id}/${timestamp}.${fileExt}`;
      
      console.log('📁 Nome do arquivo:', fileName);
      
      // VALIDAÇÃO 4: Converter blob para file
      const croppedFile = new File([croppedBlob], fileName, {
        type: 'image/jpeg'
      });
      
      console.log('📦 Arquivo criado:', {
        name: croppedFile.name,
        size: croppedFile.size,
        type: croppedFile.type
      });
      
      // VALIDAÇÃO 5: Fazer upload
      console.log('⬆️ Iniciando upload para storage...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedFile, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        console.error('❌ Erro no upload:', {
          message: uploadError.message,
          name: uploadError.name,
          error: uploadError
        });
        throw uploadError;
      }
      
      console.log('✅ Upload concluído:', uploadData);
      
      // VALIDAÇÃO 6: Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      console.log('🔗 URL pública gerada:', publicUrl);
      
      // VALIDAÇÃO 7: Atualizar estado
      setAvatarUrl(publicUrl);
      setShowCropDialog(false);
      
      toast({
        title: "✅ Sucesso",
        description: "Foto enviada com sucesso!"
      });
      
    } catch (error: any) {
      console.error('❌ ERRO COMPLETO:', error);
      
      // Mensagens de erro mais específicas
      let errorMessage = "Erro ao fazer upload da foto";
      
      if (error.message?.includes('autenticação') || error.message?.includes('autenticado')) {
        errorMessage = "Sessão expirada. Faça login novamente.";
      } else if (error.message?.includes('vazia') || error.message?.includes('processar')) {
        errorMessage = "Falha ao processar imagem. Tente novamente.";
      } else if (error.message?.includes('permission') || error.message?.includes('access denied')) {
        errorMessage = "Sem permissão para fazer upload. Contate o suporte.";
      } else if (error.message?.includes('size') || error.message?.includes('large')) {
        errorMessage = "Imagem muito grande. Tamanho máximo: 2MB";
      } else if (error.message) {
        errorMessage = `Erro: ${error.message}`;
      }
      
      toast({
        title: "❌ Erro",
        description: errorMessage,
        variant: "destructive"
      });
      
      setShowCropDialog(false);
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <div className="p-4 border-b border-primary/20 bg-card/30 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowProfileDialog(true)}
            className="relative group"
          >
            <Avatar className="h-12 w-12 ring-2 ring-primary/30 group-hover:ring-primary/60 transition-all">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary">
                {profile?.full_name ? getInitials(profile.full_name) : <User className="h-5 w-5" />}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
              <Edit className="h-4 w-4 text-white" />
            </div>
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {profile?.full_name || 'Usuário'}
            </p>
            <p className="text-xs text-muted-foreground">
              {profile?.crypto_experience || 'Iniciante'}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="p-1.5 opacity-50 hover:opacity-100 rounded-md transition-all"
            title="Sair"
          >
            <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-md bg-card border-primary/20">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24 ring-2 ring-primary/30">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                  {fullName ? getInitials(fullName) : <User className="h-10 w-10" />}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Enviando...' : 'Trocar Foto'}
                </Button>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarSelect}
                />
              </div>
            </div>

            <ImageCropDialog
              image={imageToCrop || ''}
              open={showCropDialog}
              onClose={() => setShowCropDialog(false)}
              onCropComplete={handleCropComplete}
            />

            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome completo"
                maxLength={30}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Idade</Label>
              <Input
                id="age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Sua idade"
                min={13}
                max={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Tempo operando cripto</Label>
              <Select value={cryptoExperience} onValueChange={setCryptoExperience}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="< 6 meses">Menos de 6 meses</SelectItem>
                  <SelectItem value="6-12 meses">6-12 meses</SelectItem>
                  <SelectItem value="1-3 anos">1-3 anos</SelectItem>
                  <SelectItem value="3-5 anos">3-5 anos</SelectItem>
                  <SelectItem value="5+ anos">Mais de 5 anos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowProfileDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveProfile}>
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
